/**
 * @swagger
 *
 * /cambio-password:
 *   tags:
 *     - Auth
 */

const {ERROR_TYPES} = require('../../responses/ApiResponse');

module.exports = {
  friendlyName: 'CambioPassword',

  description: 'Cambia la password dell\'utente autenticato. Richiede la vecchia password per conferma. Non disponibile per utenti di dominio.',

  inputs: {
    vecchiaPassword: {
      type: 'string',
      required: true,
      description: 'La password attuale dell\'utente'
    },
    nuovaPassword: {
      type: 'string',
      required: true,
      description: 'La nuova password da impostare',
      minLength: 8
    }
  },

  exits: {
    success: {
      description: 'Password cambiata con successo'
    }
  },

  fn: async function (inputs, exits) {
    const req = this.req;
    const res = this.res;

    try {
      const username = req.tokenData.username;

      // Recupera l'utente
      const utente = await Auth_Utenti.findOne({username});

      if (!utente) {
        return res.ApiResponse({
          errType: ERROR_TYPES.NON_TROVATO,
          errMsg: 'Utente non trovato'
        });
      }

      // Verifica che non sia un utente di dominio
      if (utente.allow_domain_login && utente.domain) {
        return res.ApiResponse({
          errType: ERROR_TYPES.ERRORE_GENERICO,
          errMsg: 'Il cambio password non è disponibile per utenti di dominio'
        });
      }

      // Verifica che l'utente abbia una password locale impostata
      if (!utente.hash_password) {
        return res.ApiResponse({
          errType: ERROR_TYPES.ERRORE_GENERICO,
          errMsg: 'Nessuna password locale impostata per questo utente'
        });
      }

      // Verifica la vecchia password
      try {
        await sails.helpers.passwords.checkPassword(inputs.vecchiaPassword, utente.hash_password);
      } catch (e) {
        return res.ApiResponse({
          errType: ERROR_TYPES.NON_AUTORIZZATO,
          errMsg: 'La password attuale non è corretta'
        });
      }

      // Validazione complessità nuova password
      const pwd = inputs.nuovaPassword;
      const erroriComplessita = [];
      if (pwd.length < 8) { erroriComplessita.push('almeno 8 caratteri'); }
      if (!/[A-Z]/.test(pwd)) { erroriComplessita.push('almeno una lettera maiuscola'); }
      if (!/[a-z]/.test(pwd)) { erroriComplessita.push('almeno una lettera minuscola'); }
      if (!/[0-9]/.test(pwd)) { erroriComplessita.push('almeno un numero'); }
      if (!/[^A-Za-z0-9]/.test(pwd)) { erroriComplessita.push('almeno un carattere speciale'); }

      if (erroriComplessita.length > 0) {
        return res.ApiResponse({
          errType: ERROR_TYPES.ERRORE_GENERICO,
          errMsg: 'La nuova password non rispetta i requisiti di complessità: ' + erroriComplessita.join(', ')
        });
      }

      // Hash della nuova password e aggiornamento
      const nuovaHash = await sails.helpers.passwords.hashPassword(inputs.nuovaPassword);

      await Auth_Utenti.updateOne({id: utente.id}).set({
        hash_password: nuovaHash
      });

      await sails.helpers.log.with({
        level: 'info',
        tag: 'CAMBIO_PASSWORD',
        message: 'Password cambiata con successo',
        action: 'cambio-password',
        ipAddress: req.ip,
        user: username
      });

      return res.ApiResponse({
        data: {message: 'Password cambiata con successo'}
      });

    } catch (err) {
      sails.log.error('Errore cambio password:', err);
      return res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: 'Errore durante il cambio password'
      });
    }
  }
};
