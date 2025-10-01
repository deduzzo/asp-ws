/**
 * @swagger
 *
 * /new-user:
 *   tags:
 *     - Admin
 * tags:
 *   - name: Admin
 *     description: Amministrazione del portale api
 */

const {ERROR_TYPES} = require('../../responses/ApiResponse');

module.exports = {

  friendlyName: 'Crea un nuovo utente',

  description: 'Crea un nuovo utente validando ambito e scopi, e aggiornando la tabella utenti_scopi.',
  swagger: false,
  inputs: {
    username: {
      type: 'string',
      required: true,
      description: 'Username'
    },
    password: {
      type: 'string',
      required: false,
      description: 'Password, non obbligatoria in caso di utente di dominio'
    },
    email: {
      type: 'string',
      required: true,
      description: 'Email'
    },
    domain: {
      type: 'string',
      required: false,
      description: 'Eventuale dominio (se si tratta di utente interno)'
    },
    otpRequired: {
      type: 'boolean',
      required: false,
      description: 'Se true, l\'utente deve fornire un OTP prima di poter accedere'
    },
    otpType: {
      type: 'string',
      required: false,
      isIn: ['mail', 'authenticator'],
      description: 'Tipo di OTP (mail o authenticator)'
    },
    ambito: {
      type: 'string',
      required: true,
      description: 'Ambito utente'
    },
    scopi: {
      type: 'string',
      required: true,
      description: 'Scopi abilitati per l\'utente, separati da virgola'
    },
    livello: {
      type: 'string',
      required: true,
      isIn: ['guest', 'user', 'admin', 'superAdmin'],
      description: 'Livello utente'
    },
  },

  exits: {},

  fn: async function (inputs) {
    const res = this.res;
    try {
      // Normalizza lista scopi
      const scopiList = Array.from(new Set((inputs.scopi || '')
        .split(',')
        .map(s => s.trim())
        .filter(s => s && s.length > 0)));

      if (scopiList.length === 0) {
        return res.ApiResponse({
          errType: ERROR_TYPES.BAD_REQUEST,
          errMsg: 'Specificare almeno uno scopo (separati da virgola)'
        });
      }

      // Verifica esistenza ambito
      const ambitoRow = await Auth_Ambiti.findOne({ambito: inputs.ambito});
      if (!ambitoRow) {
        return res.ApiResponse({
          errType: ERROR_TYPES.NOT_FOUND,
          errMsg: `Ambito non trovato: ${inputs.ambito}`
        });
      }

      // Verifica esistenza livello
      const livelloRow = await Auth_Livelli.findOne({livello: inputs.livello});
      if (!livelloRow) {
        return res.ApiResponse({
          errType: ERROR_TYPES.NOT_FOUND,
          errMsg: `Livello non trovato: ${inputs.livello}`
        });
      }

      // Verifica esistenza scopi
      const scopiFound = await Auth_Scopi.find({scopo: scopiList});
      const foundSet = new Set(scopiFound.map(s => s.scopo));
      const missing = scopiList.filter(s => !foundSet.has(s));
      if (missing.length > 0) {
        return res.ApiResponse({
          errType: ERROR_TYPES.NOT_FOUND,
          errMsg: `Scopi non trovati: ${missing.join(', ')}`
        });
      }

      // Regole password/dominio
      const hasDomain = !!(inputs.domain && String(inputs.domain).trim());
      if (!hasDomain && !inputs.password) {
        return res.ApiResponse({
          errType: ERROR_TYPES.BAD_REQUEST,
          errMsg: 'Password obbligatoria per utenti senza dominio'
        });
      }

      // Unicità username + domain
      const existing = await Auth_Utenti.findOne({
        username: inputs.username,
        domain: hasDomain ? inputs.domain : null
      });
      if (existing) {
        return res.ApiResponse({
          errType: ERROR_TYPES.ALREADY_EXISTS,
          errMsg: 'Utente già esistente per il dominio specificato'
        });
      }

      // Hash password se presente
      let passwordHash = null;
      if (inputs.password) {
        passwordHash = await sails.helpers.passwords.hashPassword(inputs.password);
      }

      // Crea utente
      const newUser = await Auth_Utenti.create({
        username: inputs.username,
        allow_domain_login: hasDomain,
        domain: hasDomain ? inputs.domain : null,
        mail: inputs.email,
        ambito: ambitoRow.id,
        hash_password: passwordHash,
        livello: livelloRow.id,
        attivo: true,
        otp_enabled: !!inputs.otpRequired,
        otp_type: inputs.otpType || null,
      }).fetch();

      // Collega scopi (aggiorna utenti_scopi)
      const scopiIds = scopiFound.map(s => s.id);
      if (scopiIds.length > 0) {
        await Auth_Utenti.addToCollection(newUser.id, 'scopi').members(scopiIds);
      }

      // Ritorna dati utente creato (sanitize)
      return res.ApiResponse({
        data: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.mail,
          domain: newUser.domain,
          allow_domain_login: newUser.allow_domain_login,
          ambito: ambitoRow.ambito,
          livello: livelloRow.livello,
          otp_enabled: newUser.otp_enabled,
          otp_type: newUser.otp_type,
          scopi: scopiFound.map(s => s.scopo)
        }
      });
    } catch (err) {
      return res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: 'Errore generico creazione utente'
      });
    }
  }

};
