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

  description: 'Avvia il flow di login SPID/CIE server-side. Identifica il consumer tramite slug (auth.spid_consumers); recupera la redirect_uri associata; genera state HMAC firmato; redireziona il browser sul authorize endpoint di Keycloak. Al termine del login asp-ws redireziona alla redirect_uri del consumer con JWT proprietario in querystring (asp_token).',

  inputs: {
    consumer: {
      type: 'string',
      required: true,
      description: 'Slug univoco del consumer registrato in auth.spid_consumers (es. "cambiomedico-mobile").'
    },
    scopi: {
      type: 'string',
      required: true,
      description: 'Scopi richiesti per il token JWT proprietario, separati da spazio.'
    },
    ambito: {
      type: 'string',
      required: false,
      description: 'Ambito d\'utenza del token. Default: ambito associato al consumer (se presente), altrimenti spidLogin.defaultAmbito.'
    },
    idp: {
      type: 'string',
      required: false,
      description: 'kc_idp_hint opzionale per saltare la pagina di scelta IdP di Keycloak.'
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

    // Lookup consumer per slug (gestione da pannello admin).
    const slug = (inputs.consumer || '').trim().toLowerCase();
    const consumer = await Auth_SpidConsumers.findOne({slug, attivo: true}).populate('ambito');
    if (!consumer) {
      await sails.helpers.log.with({
        level: 'warn',
        tag: TAGS.LOGIN_SPID_KO,
        message: 'consumer slug non valido',
        action: req.options.action,
        ipAddress: req.ip,
        context: {error: 'invalid_consumer', slug}
      });
      return res.ApiResponse({
        errType: ERROR_TYPES.BAD_REQUEST,
        errMsg: 'consumer non valido o disattivato'
      });
    }

    const redirectUri = consumer.redirect_uri;

    // Ambito: il consumer ne ha uno associato? -> wins; altrimenti input; altrimenti default config.
    const ambito = (consumer.ambito && consumer.ambito.ambito) || inputs.ambito || cfg.defaultAmbito;
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
        redirect_uri: redirectUri,
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
      context: {consumer: slug, scopi, ambito, redirect_uri: redirectUri, idp: inputs.idp || null}
    });

    return res.redirect(302, authorizeUrl);
  }
};
