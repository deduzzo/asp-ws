/* eslint-disable camelcase */
/**
 * @swagger
 *
 * /start:
 *   tags:
 *     - Auth SPID
 * tags:
 *   - name: Auth SPID
 *     description: Login server-side SPID/CIE via Keycloak. Il flow si completa con un redirect alla redirect_uri whitelistata, che riceve il JWT proprietario in querystring (param "asp_token").
 */

const {ERROR_TYPES} = require('../../../responses/ApiResponse');
const {TAGS} = require('../../../models/Log');
const SpidStateService = require('../../../services/SpidStateService');
const SpidOidcService = require('../../../services/SpidOidcService');

module.exports = {
  friendlyName: 'SpidLoginStart',

  description: 'Avvia il flow di login SPID/CIE server-side. Genera lo state firmato e redireziona il browser sul authorize endpoint di Keycloak. Al termine del login, asp-ws redirezionera la redirect_uri (whitelistata) con un JWT proprietario in querystring.',

  inputs: {
    scopi: {
      type: 'string',
      required: true,
      description: 'Scopi richiesti per il token JWT proprietario, separati da spazio.'
    },
    ambito: {
      type: 'string',
      required: false,
      description: 'Ambito d\'utenza del token. Default: configurazione spidLogin.defaultAmbito.'
    },
    redirect_uri: {
      type: 'string',
      required: true,
      description: 'URL di destinazione dove asp-ws redirigera con asp_token. Deve essere strict-equal ad un valore in spidLogin.allowedRedirectUris.'
    },
    idp: {
      type: 'string',
      required: false,
      description: 'kc_idp_hint opzionale per saltare la pagina di scelta IdP di Keycloak (es. nome del provider SPID/CIE).'
    }
  },

  exits: {},

  fn: async function (inputs) {
    const req = this.req;
    const res = this.res;
    const cfg = sails.config.custom.spidLogin;

    if (!cfg) {
      return res.ApiResponse({
        errType: ERROR_TYPES.SERVIZIO_NON_DISPONIBILE,
        errMsg: 'Login SPID/CIE non configurato'
      });
    }

    const allowed = Array.isArray(cfg.allowedRedirectUris) ? cfg.allowedRedirectUris : [];
    if (!allowed.includes(inputs.redirect_uri)) {
      await sails.helpers.log.with({
        level: 'warn',
        tag: TAGS.LOGIN_SPID_KO,
        message: 'redirect_uri non whitelistata',
        action: req.options.action,
        ipAddress: req.ip,
        context: {error: 'invalid_redirect_uri', redirect_uri: inputs.redirect_uri}
      });
      return res.ApiResponse({
        errType: ERROR_TYPES.BAD_REQUEST,
        errMsg: 'redirect_uri non valida'
      });
    }

    const ambito = inputs.ambito || cfg.defaultAmbito;
    const scopi = inputs.scopi.split(' ').map(s => s.trim()).filter(Boolean);
    if (scopi.length === 0) {
      return res.ApiResponse({
        errType: ERROR_TYPES.BAD_REQUEST,
        errMsg: 'scopi obbligatori'
      });
    }

    let state;
    let authorizeUrl;
    try {
      state = SpidStateService.encode({
        scopi,
        ambito,
        redirect_uri: inputs.redirect_uri,
        idp: inputs.idp || null
      });
      authorizeUrl = await SpidOidcService.buildAuthorizeUrl({state, idp: inputs.idp});
    } catch (err) {
      sails.log.error('[spid/start] Errore avvio flow:', err.message);
      await sails.helpers.log.with({
        level: 'error',
        tag: TAGS.LOGIN_SPID_KO,
        message: 'Errore avvio flow SPID',
        action: req.options.action,
        ipAddress: req.ip,
        context: {error: 'kc_discovery_failed', err: err.message}
      });
      return res.ApiResponse({
        errType: ERROR_TYPES.SERVIZIO_NON_DISPONIBILE,
        errMsg: 'Provider di identita non raggiungibile'
      });
    }

    await sails.helpers.log.with({
      level: 'info',
      tag: TAGS.LOGIN_SPID_START,
      message: 'Avvio flow SPID/CIE',
      action: req.options.action,
      ipAddress: req.ip,
      context: {scopi, ambito, redirect_uri: inputs.redirect_uri, idp: inputs.idp || null}
    });

    return res.redirect(302, authorizeUrl);
  }
};
