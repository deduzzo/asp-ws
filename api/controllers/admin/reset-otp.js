/**
 * @swagger
 *
 * /admin-op/reset-otp:
 *   tags:
 *     - Admin
 */

const {ERROR_TYPES} = require('../../responses/ApiResponse');

module.exports = {
  friendlyName: 'Admin reset OTP',
  description: 'Resetta la configurazione OTP di un utente, disabilitandola e rimuovendo tutti i dati OTP.',
  swagger: {
    tags: ['Admin']
  },
  inputs: {
    id: {
      type: 'number',
      required: true,
      description: 'ID dell\'utente a cui resettare l\'OTP'
    }
  },

  fn: async function (inputs) {
    try {
      const utente = await Auth_Utenti.findOne({id: inputs.id});

      if (!utente) {
        return this.res.ApiResponse({
          errType: ERROR_TYPES.NON_TROVATO,
          errMsg: 'Utente non trovato'
        });
      }

      await Auth_Utenti.updateOne({id: utente.id}).set({
        otp_enabled: false,
        otp_type: null,
        otp: null,
        otp_exp: null,
        otp_key: null
      });

      await sails.helpers.log.with({
        level: 'info',
        tag: 'ADMIN',
        message: `OTP resettato per utente ${utente.username} (id: ${utente.id})`,
        action: 'ADMIN_RESET_OTP',
        ipAddress: this.req.ip,
        user: this.req.tokenData.username,
        context: {targetUserId: utente.id, targetUsername: utente.username}
      });

      return this.res.ApiResponse({
        data: {
          message: 'OTP resettato con successo',
          username: utente.username
        }
      });

    } catch (err) {
      sails.log.error('Errore admin reset OTP:', err);
      return this.res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: 'Errore durante il reset dell\'OTP'
      });
    }
  }
};
