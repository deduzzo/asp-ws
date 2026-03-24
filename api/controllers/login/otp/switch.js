/**
 * @swagger
 *
 * /switch:
 *   tags:
 *     - Otp
 */

const {ERROR_TYPES} = require('../../../responses/ApiResponse');

module.exports = {
  friendlyName: 'OtpSwitch',

  description: 'Cambia il metodo OTP attivo tra mail e totp. Il metodo di destinazione deve essere già configurato.',

  inputs: {
    nuovoTipo: {
      type: 'string',
      required: true,
      isIn: ['mail', 'totp'],
      description: 'Il nuovo tipo OTP da attivare (mail o totp)'
    }
  },

  exits: {
    success: {
      description: 'Metodo OTP cambiato'
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

      // Verifica che l'OTP sia attivo
      if (!utente.otp_enabled) {
        return res.ApiResponse({
          errType: ERROR_TYPES.ERRORE_GENERICO,
          errMsg: 'OTP non è attivo per questo utente'
        });
      }

      // Verifica che non stia già usando il tipo richiesto
      if (utente.otp_type === inputs.nuovoTipo) {
        return res.ApiResponse({
          errType: ERROR_TYPES.ERRORE_GENERICO,
          errMsg: `Il metodo OTP è già impostato su ${inputs.nuovoTipo}`
        });
      }

      // Verifica che il metodo di destinazione sia configurato
      if (inputs.nuovoTipo === 'totp') {
        if (!utente.otp_key) {
          return res.ApiResponse({
            errType: ERROR_TYPES.ERRORE_GENERICO,
            errMsg: 'TOTP non configurato. Eseguire prima /otp/setup e /otp/verify-setup'
          });
        }
      }

      if (inputs.nuovoTipo === 'mail') {
        if (!utente.mail) {
          return res.ApiResponse({
            errType: ERROR_TYPES.ERRORE_GENERICO,
            errMsg: 'Nessun indirizzo email configurato per questo utente'
          });
        }
      }

      // Cambia il tipo OTP
      await Auth_Utenti.updateOne({id: utente.id}).set({
        otp_type: inputs.nuovoTipo
      });

      await sails.helpers.log.with({
        level: 'info',
        tag: 'OTP_SWITCH',
        message: `Metodo OTP cambiato da ${utente.otp_type} a ${inputs.nuovoTipo}`,
        action: 'otp-switch',
        ipAddress: req.ip,
        user: username
      });

      return res.ApiResponse({
        data: {message: `Metodo OTP cambiato a ${inputs.nuovoTipo}`}
      });

    } catch (err) {
      sails.log.error('Errore OTP switch:', err);
      return res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: 'Errore durante il cambio metodo OTP'
      });
    }
  }
};
