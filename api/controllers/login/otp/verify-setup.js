/**
 * @swagger
 *
 * /verify-setup:
 *   tags:
 *     - Otp
 */

const {ERROR_TYPES} = require('../../../responses/ApiResponse');
const {authenticator} = require('otplib');

module.exports = {
  friendlyName: 'OtpVerifySetup',

  description: 'Verifica il primo codice TOTP dall\'app authenticator e attiva il TOTP come metodo OTP.',

  inputs: {
    codice: {
      type: 'string',
      required: true,
      description: 'Il codice a 6 cifre generato dall\'app authenticator'
    }
  },

  exits: {
    success: {
      description: 'TOTP verificato e attivato'
    }
  },

  fn: async function (inputs, exits) {
    const req = this.req;
    const res = this.res;

    try {
      const username = req.tokenData.username;

      const utente = await Auth_Utenti.findOne({username});

      if (!utente) {
        return res.ApiResponse({
          errType: ERROR_TYPES.NON_TROVATO,
          errMsg: 'Utente non trovato'
        });
      }

      // Verifica che il setup sia stato fatto (otp_key presente)
      if (!utente.otp_key) {
        return res.ApiResponse({
          errType: ERROR_TYPES.ERRORE_GENERICO,
          errMsg: 'Nessun setup TOTP in corso. Eseguire prima /otp/setup'
        });
      }

      // Verifica il codice TOTP con tolleranza ±1 window (30s)
      authenticator.options = {window: 1};
      const isValid = authenticator.check(inputs.codice, utente.otp_key);

      if (!isValid) {
        return res.ApiResponse({
          errType: ERROR_TYPES.NON_AUTORIZZATO,
          errMsg: 'Codice TOTP non valido. Verificare la configurazione dell\'app authenticator'
        });
      }

      // Attiva TOTP
      await Auth_Utenti.updateOne({id: utente.id}).set({
        otp_enabled: true,
        otp_type: 'totp'
      });

      await sails.helpers.log.with({
        livello: 'info',
        tag: 'OTP_VERIFY_SETUP',
        azione: 'otp-verify-setup',
        ip: req.ip,
        utente: username,
        parametri: 'TOTP attivato con successo'
      });

      return res.ApiResponse({
        data: {message: 'TOTP attivato con successo'}
      });

    } catch (err) {
      sails.log.error('Errore OTP verify-setup:', err);
      return res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: 'Errore durante la verifica del setup OTP'
      });
    }
  }
};
