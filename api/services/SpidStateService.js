/* eslint-disable camelcase */
/**
 * SpidStateService.js
 *
 * Encode/decode dello "state" usato nel flow OIDC SPID/CIE server-side.
 *
 * Lo state e' una stringa <payload>.<sig> dove:
 *   payload = base64url(JSON.stringify({scopi, ambito, redirect_uri, idp, nonce, exp}))
 *   sig     = base64url(HMAC-SHA256(stateSecret, payload))
 *
 * Ne consegue che asp-ws non deve persistere alcuna sessione: tutti i dati di
 * round-trip viaggiano nel state e sono protetti da firma + scadenza.
 *
 * camelcase disabilitato: redirect_uri e' il nome canonico del parametro OIDC.
 */

const crypto = require('crypto');

function getConfig() {
  const cfg = sails.config.custom.spidLogin;
  if (!cfg || !cfg.stateSecret || cfg.stateSecret.length < 32) {
    throw new Error('SPID login non configurato o stateSecret troppo corto (minimo 32 caratteri)');
  }
  return cfg;
}

function base64UrlEncode(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str) {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4;
  if (pad) {s += '='.repeat(4 - pad);}
  return Buffer.from(s, 'base64');
}

function hmac(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest();
}

const SpidStateService = {
  /**
   * Codifica un payload di state firmato.
   * @param {Object} data - {scopi: string[], ambito: string, redirect_uri: string, idp?: string}
   * @returns {string} state firmato pronto da passare a Keycloak
   */
  encode: (data) => {
    const cfg = getConfig();
    const payloadObj = {
      scopi: data.scopi,
      ambito: data.ambito,
      redirect_uri: data.redirect_uri,
      idp: data.idp || null,
      nonce: crypto.randomBytes(16).toString('hex'),
      exp: Math.floor(Date.now() / 1000) + (cfg.stateTtlSeconds || 600)
    };
    const payload = base64UrlEncode(JSON.stringify(payloadObj));
    const sig = base64UrlEncode(hmac(cfg.stateSecret, payload));
    return payload + '.' + sig;
  },

  /**
   * Decodifica e valida un state firmato.
   * @param {string} state
   * @returns {Object} payload decodificato
   * @throws {Error} se state malformato, firma invalida o scaduto
   */
  decode: (state) => {
    const cfg = getConfig();
    if (!state || typeof state !== 'string') {
      const err = new Error('state mancante');
      err.code = 'state_invalid';
      throw err;
    }
    const parts = state.split('.');
    if (parts.length !== 2) {
      const err = new Error('state malformato');
      err.code = 'state_invalid';
      throw err;
    }
    const [payload, sig] = parts;
    const expectedSig = base64UrlEncode(hmac(cfg.stateSecret, payload));
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      const err = new Error('firma state non valida');
      err.code = 'state_invalid';
      throw err;
    }
    let data;
    try {
      data = JSON.parse(base64UrlDecode(payload).toString('utf8'));
    } catch (unusedParse) {
      const err = new Error('payload state non parsabile');
      err.code = 'state_invalid';
      throw err;
    }
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) {
      const err = new Error('state scaduto');
      err.code = 'state_invalid';
      throw err;
    }
    return data;
  }
};

module.exports = SpidStateService;
