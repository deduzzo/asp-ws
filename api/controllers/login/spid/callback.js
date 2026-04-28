/* eslint-disable camelcase */
/**
 * @swagger
 *
 * /callback:
 *   tags:
 *     - Auth SPID
 */

const {TAGS} = require('../../../models/Log');
const JwtService = require('../../../services/JwtService');
const SpidStateService = require('../../../services/SpidStateService');
const SpidOidcService = require('../../../services/SpidOidcService');

// Mappa errori AGID SPID (utente/IdP/sistema). Pattern matching su error/error_description
// proveniente da Keycloak. Cf. keykloak-test-auth/server.js (riferimento di progetto).
function detectSpidErrorCode(error, errorDescription) {
  const text = `${error || ''} ${errorDescription || ''}`.toLowerCase();
  const m = text.match(/error[ _-]?(\d{1,2})/);
  if (m) {return `spid_${m[1]}`;}
  if (/access_denied|consent|consenso|denied|negat/.test(text)) {return 'spid_21';}
  if (/login_required|interaction_required|timeout|scadut|tempo/.test(text)) {return 'spid_20';}
  if (/authnfailed|autenticazione fallita|credenziali|wrong password/.test(text)) {return 'spid_19';}
  if (/sospes|revocat|suspended|revoked|bloccat/.test(text)) {return 'spid_22';}
  if (/annullat|cancel|abort|interrott/.test(text)) {return 'spid_23';}
  return 'kc_token_exchange_failed';
}

function buildRedirectWithError(redirectUri, errorCode, errorDescription) {
  const sep = redirectUri.includes('?') ? '&' : '?';
  const desc = errorDescription ? `&error_description=${encodeURIComponent(errorDescription)}` : '';
  return `${redirectUri}${sep}error=${encodeURIComponent(errorCode)}${desc}`;
}

function buildRedirectWithToken(redirectUri, tokenParamName, token, expireDate) {
  const sep = redirectUri.includes('?') ? '&' : '?';
  return `${redirectUri}${sep}${tokenParamName}=${encodeURIComponent(token)}` +
    `&expireDate=${encodeURIComponent(expireDate)}`;
}

function renderErrorPage(res, errorCode, errorDescription) {
  res.status(400);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(`<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><title>Errore login SPID/CIE</title>
<style>body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:40px;}
.box{max-width:600px;margin:0 auto;background:#fff;padding:32px;border-radius:8px;box-shadow:0 0 10px rgba(0,0,0,.1);}
h1{color:#dc2626;margin-top:0;} code{background:#f1f5f9;padding:2px 6px;border-radius:4px;}</style>
</head><body><div class="box"><h1>Errore di autenticazione</h1>
<p>Codice: <code>${errorCode}</code></p>
${errorDescription ? `<p>${errorDescription}</p>` : ''}
<p>Si prega di tornare indietro e riprovare. Se il problema persiste, contattare l'assistenza.</p>
</div></body></html>`);
}

// Incrementa contatore Prometheus persistente sul DB metrics_counters.
// Pattern allineato a effettua-cambio.js / verifica.js.
function incrementSpidMetric(outcome) {
  const sql = 'INSERT INTO metrics_counters (metric, label1_name, label1_value, label2_name, label2_value, cnt) ' +
    'VALUES (?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE cnt = cnt + 1';
  Log.getDatastore().sendNativeQuery(sql, ['asp_spid_login', 'outcome', outcome, '', '']).catch((e) => {
    sails.log.warn('[spid metric] Errore incremento counter:', e.message);
  });
}

module.exports = {
  friendlyName: 'SpidLoginCallback',

  description: 'Callback OIDC da Keycloak. Chiude il flow SPID/CIE: scambia il code, verifica id_token, fa il match utente per CF, emette il JWT proprietario e redireziona alla redirect_uri originale con asp_token in querystring.',

  inputs: {
    code: {type: 'string', required: false, description: 'Authorization code emesso da Keycloak'},
    state: {type: 'string', required: false, description: 'State firmato emesso in /start'},
    error: {type: 'string', required: false, description: 'Codice errore propagato dall\'IdP (se presente)'},
    error_description: {type: 'string', required: false, description: 'Descrizione errore IdP (se presente)'}
  },

  exits: {},

  fn: async function (inputs) {
    const req = this.req;
    const res = this.res;
    const cfg = sails.config.custom.spidLogin;

    if (!cfg) {
      incrementSpidMetric('config_missing');
      return renderErrorPage(res, 'service_unavailable', 'Login SPID/CIE non configurato');
    }

    // 1) Decodifica state per primo: ci serve la redirect_uri per qualunque errore successivo
    let stateData = null;
    try {
      stateData = SpidStateService.decode(inputs.state);
    } catch (err) {
      incrementSpidMetric('state_invalid');
      await sails.helpers.log.with({
        level: 'warn', tag: TAGS.LOGIN_SPID_KO, message: 'state non valido',
        action: req.options.action, ipAddress: req.ip,
        context: {error: 'state_invalid', err: err.message}
      });
      return renderErrorPage(res, 'state_invalid',
        'Sessione di login scaduta o manomessa. Si prega di riavviare il login.');
    }

    const redirectUri = stateData.redirect_uri;
    const tokenParamName = cfg.tokenQueryParamName || 'asp_token';

    // 2) Errore propagato da Keycloak/IdP
    if (inputs.error) {
      const code = detectSpidErrorCode(inputs.error, inputs.error_description);
      incrementSpidMetric(code.startsWith('spid_') ? 'spid_user_error' : code);
      await sails.helpers.log.with({
        level: 'warn', tag: TAGS.LOGIN_SPID_KO, message: 'Errore IdP/SPID', action: req.options.action,
        ipAddress: req.ip,
        context: {error: code, raw: inputs.error, raw_description: inputs.error_description}
      });
      return res.redirect(302, buildRedirectWithError(redirectUri, code, inputs.error_description));
    }

    if (!inputs.code) {
      incrementSpidMetric('invalid_request');
      return res.redirect(302, buildRedirectWithError(redirectUri, 'invalid_request',
        'code mancante dalla risposta IdP'));
    }

    // 3) Scambio code -> tokenSet (firma id_token verificata da openid-client)
    let tokenSet;
    try {
      tokenSet = await SpidOidcService.exchangeCode({code: inputs.code, state: inputs.state});
    } catch (err) {
      const isVerify = /verify|signature|aud|iss|exp/i.test(err.message || '');
      const code = isVerify ? 'kc_id_token_invalid' : 'kc_token_exchange_failed';
      incrementSpidMetric(code);
      sails.log.error('[spid/callback] Errore exchangeCode:', err.message);
      await sails.helpers.log.with({
        level: 'error', tag: TAGS.LOGIN_SPID_KO, message: 'Errore scambio code/token',
        action: req.options.action, ipAddress: req.ip,
        context: {error: code, err: err.message}
      });
      return res.redirect(302, buildRedirectWithError(redirectUri, code));
    }

    // 4) Estrazione CF dall'identita' SPID/CIE
    const identity = await SpidOidcService.extractIdentity(tokenSet);
    const cf = identity.cf;
    if (!cf) {
      incrementSpidMetric('cf_missing');
      await sails.helpers.log.with({
        level: 'warn', tag: TAGS.LOGIN_SPID_KO, message: 'CF mancante nel token',
        action: req.options.action, ipAddress: req.ip,
        context: {error: 'cf_missing'}
      });
      return res.redirect(302, buildRedirectWithError(redirectUri, 'cf_missing'));
    }

    // 5) Lookup ambito
    const ambitoNome = stateData.ambito || cfg.defaultAmbito;
    const ambitoRecord = await Auth_Ambiti.findOne({ambito: ambitoNome});
    if (!ambitoRecord) {
      incrementSpidMetric('ambito_invalid');
      await sails.helpers.log.with({
        level: 'warn', tag: TAGS.LOGIN_SPID_KO, message: 'Ambito non valido',
        action: req.options.action, ipAddress: req.ip, user: cf,
        context: {error: 'ambito_invalid', ambito: ambitoNome}
      });
      return res.redirect(302, buildRedirectWithError(redirectUri, 'ambito_invalid'));
    }

    // 6) Match utente (username = CF maiuscolo)
    const utente = await Auth_Utenti.findOne({username: cf, ambito: ambitoRecord.id})
      .populate('scopi').populate('ambito');

    if (!utente) {
      incrementSpidMetric('user_not_found');
      await sails.helpers.log.with({
        level: 'warn', tag: TAGS.LOGIN_SPID_KO, message: 'Utente non registrato per CF',
        action: req.options.action, ipAddress: req.ip, user: cf,
        context: {error: 'user_not_found', cf, ambito: ambitoNome}
      });
      return res.redirect(302, buildRedirectWithError(redirectUri, 'user_not_found'));
    }

    if (!utente.attivo) {
      incrementSpidMetric('user_inactive');
      await sails.helpers.log.with({
        level: 'warn', tag: TAGS.LOGIN_SPID_KO, message: 'Utente disattivato',
        action: req.options.action, ipAddress: req.ip, user: utente.username,
        context: {error: 'user_inactive'}
      });
      return res.redirect(302, buildRedirectWithError(redirectUri, 'user_inactive'));
    }

    // 7) Verifica scopi
    const scopiRichiesti = (stateData.scopi || []).filter(Boolean);
    const scopiAttivi = utente.scopi.filter(s => s.attivo).map(s => s.scopo);
    const tuttiAutorizzati = scopiRichiesti.every(s => scopiAttivi.includes(s));
    if (!tuttiAutorizzati) {
      incrementSpidMetric('scope_unauthorized');
      await sails.helpers.log.with({
        level: 'warn', tag: TAGS.LOGIN_SPID_KO, message: 'Scopi non autorizzati',
        action: req.options.action, ipAddress: req.ip, user: utente.username,
        context: {error: 'scope_unauthorized', richiesti: scopiRichiesti, attivi: scopiAttivi}
      });
      return res.redirect(302, buildRedirectWithError(redirectUri, 'scope_unauthorized'));
    }

    // 8) Genera JWT proprietario.
    //    Email: prima quella da SPID (id_token), fallback Auth_Utenti.mail.
    //    Nome/cognome: solo da SPID (la tabella utenti non ha quei campi).
    const tokenObj = JwtService.generateToken({
      username: utente.username,
      scopi: scopiRichiesti,
      ambito: utente.ambito.ambito,
      id_ambito: utente.ambito.id,
      livello: utente.livello,
      auth_method: 'spid-cie',
      email: identity.email || utente.mail || null,
      nome: identity.nome || null,
      cognome: identity.cognome || null,
    });
    if (!tokenObj || !tokenObj.token) {
      incrementSpidMetric('jwt_error');
      await sails.helpers.log.with({
        level: 'error', tag: TAGS.LOGIN_SPID_KO, message: 'Errore generazione JWT',
        action: req.options.action, ipAddress: req.ip, user: utente.username,
        context: {error: 'jwt_error'}
      });
      return res.redirect(302, buildRedirectWithError(redirectUri, 'jwt_error'));
    }

    // 9) Successo
    incrementSpidMetric('ok');
    await sails.helpers.log.with({
      level: 'info', tag: TAGS.LOGIN_SPID_OK, message: 'Login SPID/CIE riuscito',
      action: req.options.action, ipAddress: req.ip, user: utente.username,
      context: {ambito: ambitoNome, scopi: scopiRichiesti}
    });

    return res.redirect(302,
      buildRedirectWithToken(redirectUri, tokenParamName, tokenObj.token, tokenObj.expireDate));
  }
};
