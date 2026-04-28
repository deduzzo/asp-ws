/* eslint-disable camelcase */
/**
 * SpidOidcService.js
 *
 * Wrapper attorno a "openid-client" per il flow SPID/CIE via Keycloak.
 *
 * - Discovery del realm Keycloak con cache in-memory (lazy).
 * - Costruzione URL di authorization (con eventuale kc_idp_hint).
 * - Scambio code -> tokenSet con verifica RS256/JWKS automatica.
 * - Estrazione del codice fiscale dal claim configurato.
 *
 * SPID e CIE condividono lo stesso client Keycloak e gli stessi mapper, quindi
 * questo service e' agnostico rispetto al provider concreto: si limita a
 * propagare l'eventuale "idp" hint ricevuto dal chiamante.
 */

const {Issuer} = require('openid-client');

let cachedClient = null;
let cachedClientPromise = null;

function getConfig() {
  const cfg = sails.config.custom.spidLogin;
  if (!cfg) {
    throw new Error('SPID login non configurato (private_spid_login.json mancante)');
  }
  if (!cfg.kcIssuer || !cfg.kcClientId || !cfg.kcClientSecret) {
    throw new Error('Configurazione SPID incompleta: kcIssuer/kcClientId/kcClientSecret obbligatori');
  }
  if (!cfg.wsBaseUrl || !cfg.callbackPath) {
    throw new Error('Configurazione SPID incompleta: wsBaseUrl/callbackPath obbligatori');
  }
  return cfg;
}

function getRedirectUri(cfg) {
  return cfg.wsBaseUrl.replace(/\/+$/, '') + cfg.callbackPath;
}

const SpidOidcService = {
  /**
   * Restituisce un'istanza openid-client Client, riutilizzando la cache.
   * Discovery viene fatto una sola volta per processo.
   */
  getClient: async () => {
    if (cachedClient) {return cachedClient;}
    if (cachedClientPromise) {return cachedClientPromise;}

    const cfg = getConfig();
    cachedClientPromise = (async () => {
      const issuer = await Issuer.discover(cfg.kcIssuer);
      const client = new issuer.Client({
        client_id: cfg.kcClientId,
        client_secret: cfg.kcClientSecret,
        redirect_uris: [getRedirectUri(cfg)],
        response_types: ['code'],
        token_endpoint_auth_method: 'client_secret_post'
      });
      cachedClient = client;
      return client;
    })();

    try {
      return await cachedClientPromise;
    } finally {
      cachedClientPromise = null;
    }
  },

  /**
   * Costruisce l'URL di authorization da redirezionare al browser.
   * @param {{state: string, idp?: string}} opts
   * @returns {Promise<string>}
   */
  buildAuthorizeUrl: async ({state, idp}) => {
    const cfg = getConfig();
    const client = await SpidOidcService.getClient();
    const params = {
      scope: cfg.kcScopes || 'openid profile email',
      state,
      redirect_uri: getRedirectUri(cfg)
    };
    if (idp) {params.kc_idp_hint = idp;}
    return client.authorizationUrl(params);
  },

  /**
   * Scambia il "code" ricevuto da Keycloak con un tokenSet (id_token, access_token).
   * openid-client verifica firma, iss, aud, exp del id_token automaticamente.
   *
   * Nota RFC 9207: openid-client v5 richiede il parametro "iss" nel redirect
   * di authorization se il well-known di Keycloak dichiara
   * "authorization_response_iss_parameter_supported": true. Alcune build/config
   * di Keycloak dichiarano il supporto ma non emettono effettivamente il
   * parametro, generando "iss missing from the response". Lo iniettiamo
   * manualmente con il valore del nostro issuer configurato: il check di
   * openid-client diventa "params.iss === this.issuer.issuer", che combacia
   * sempre dato che cfg.kcIssuer e' lo stesso usato per la discovery.
   *
   * @param {{code: string, state: string}} opts
   * @returns {Promise<TokenSet>}
   */
  exchangeCode: async ({code, state}) => {
    const cfg = getConfig();
    const client = await SpidOidcService.getClient();
    return client.callback(
      getRedirectUri(cfg),
      {code, state, iss: cfg.kcIssuer},
      {state}
    );
  },

  /**
   * Normalizza un valore CF proveniente da SPID/CIE:
   *  - uppercase + trim
   *  - rimuove prefissi NameQualifier AGID (es. "TINIT-") che SPID antepone
   *    al codice fiscale nel claim fiscalNumber
   *
   * Lista prefissi documentata: TINIT (Tax ID Number Italy, SPID),
   * eventuali aggiunte future per CIE/CNS vanno qui.
   */
  _normalizeCf: (raw) => {
    if (!raw) {return null;}
    let cf = String(raw).toUpperCase().trim();
    cf = cf.replace(/^TINIT-/, '');
    return cf || null;
  },

  /**
   * Estrae il codice fiscale dal tokenSet, in cascata:
   *  1) claims() del id_token
   *  2) decode dell'access_token (best-effort)
   *  3) chiamata a /userinfo come fallback finale
   *
   * Il valore restituito e' gia' normalizzato (uppercase, trimmed, prefissi
   * AGID rimossi) e direttamente confrontabile con Auth_Utenti.username.
   *
   * @param {TokenSet} tokenSet
   * @returns {Promise<string|null>}
   */
  extractFiscalNumber: async (tokenSet) => {
    const cfg = getConfig();
    const claimName = cfg.fiscalNumberClaim || 'fiscalNumber';

    // 1) id_token claims
    try {
      const claims = tokenSet.claims();
      if (claims && claims[claimName]) {
        return SpidOidcService._normalizeCf(claims[claimName]);
      }
    } catch (unusedClaim) { /* fallback al prossimo metodo */ }

    // 2) access_token decode (best-effort, non critico se non e' un JWT)
    try {
      if (tokenSet.access_token) {
        const parts = tokenSet.access_token.split('.');
        if (parts.length === 3) {
          const buf = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64');
          const decoded = JSON.parse(buf.toString('utf8'));
          if (decoded[claimName]) {
            return SpidOidcService._normalizeCf(decoded[claimName]);
          }
        }
      }
    } catch (unusedClaim) { /* fallback al prossimo metodo */ }

    // 3) userinfo
    try {
      const client = await SpidOidcService.getClient();
      const info = await client.userinfo(tokenSet);
      if (info && info[claimName]) {
        return SpidOidcService._normalizeCf(info[claimName]);
      }
    } catch (unusedClaim) { /* fallback al prossimo metodo */ }

    return null;
  },

  /**
   * Resetta la cache del client (utile in test).
   */
  _resetCache: () => {
    cachedClient = null;
    cachedClientPromise = null;
  }
};

module.exports = SpidOidcService;
