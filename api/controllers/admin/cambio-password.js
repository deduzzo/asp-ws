/**
 * @swagger
 *
 * /cambio-password:
 *   tags:
 *     - Admin
 */

const {ERROR_TYPES} = require('../../responses/ApiResponse');
const crypto = require('crypto');

module.exports = {
  friendlyName: 'Admin cambio password',
  description: 'Permette a un admin di cambiare la password di un utente. Se non viene fornita una password, ne genera una casuale forte.',
  inputs: {
    id: {
      type: 'number',
      required: true,
      description: 'ID dell\'utente a cui cambiare la password'
    },
    password: {
      type: 'string',
      description: 'La nuova password. Se omessa, viene generata automaticamente una password forte.'
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

      // Blocca il cambio password per utenti di dominio
      if (utente.allow_domain_login && utente.domain) {
        return this.res.ApiResponse({
          errType: ERROR_TYPES.ERRORE_GENERICO,
          errMsg: 'Il cambio password non è disponibile per utenti di dominio. La password è gestita dal dominio stesso.'
        });
      }

      let password = inputs.password;
      let generata = false;

      if (!password) {
        // Genera password forte: 16 caratteri con maiuscole, minuscole, numeri e speciali
        const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lower = 'abcdefghijklmnopqrstuvwxyz';
        const digits = '0123456789';
        const special = '!@#$%^&*()-_=+[]{}|;:,.<>?';
        const all = upper + lower + digits + special;

        // Assicura almeno un carattere per tipo
        let chars = [
          upper[crypto.randomInt(upper.length)],
          lower[crypto.randomInt(lower.length)],
          digits[crypto.randomInt(digits.length)],
          special[crypto.randomInt(special.length)]
        ];

        // Riempi fino a 16 caratteri
        for (let i = chars.length; i < 16; i++) {
          chars.push(all[crypto.randomInt(all.length)]);
        }

        // Mescola
        for (let i = chars.length - 1; i > 0; i--) {
          const j = crypto.randomInt(i + 1);
          [chars[i], chars[j]] = [chars[j], chars[i]];
        }

        password = chars.join('');
        generata = true;
      } else {
        // Validazione complessità password fornita
        const errori = [];
        if (password.length < 8) { errori.push('almeno 8 caratteri'); }
        if (!/[A-Z]/.test(password)) { errori.push('almeno una lettera maiuscola'); }
        if (!/[a-z]/.test(password)) { errori.push('almeno una lettera minuscola'); }
        if (!/[0-9]/.test(password)) { errori.push('almeno un numero'); }
        if (!/[^A-Za-z0-9]/.test(password)) { errori.push('almeno un carattere speciale'); }

        if (errori.length > 0) {
          return this.res.ApiResponse({
            errType: ERROR_TYPES.ERRORE_GENERICO,
            errMsg: 'La password non rispetta i requisiti di complessità: ' + errori.join(', ')
          });
        }
      }

      const nuovaHash = await sails.helpers.passwords.hashPassword(password);

      await Auth_Utenti.updateOne({id: utente.id}).set({
        hash_password: nuovaHash
      });

      await sails.helpers.log.with({
        level: 'info',
        tag: 'ADMIN',
        message: `Password cambiata per utente ${utente.username} (id: ${utente.id})${generata ? ' - password generata' : ''}`,
        action: 'ADMIN_CAMBIO_PASSWORD',
        ipAddress: this.req.ip,
        user: this.req.tokenData.username,
        context: {targetUserId: utente.id, targetUsername: utente.username, generata}
      });

      const risposta = {
        message: 'Password cambiata con successo',
        username: utente.username
      };

      if (generata) {
        risposta.password = password;
      }

      return this.res.ApiResponse({data: risposta});

    } catch (err) {
      sails.log.error('Errore admin cambio password:', err);
      return this.res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: 'Errore durante il cambio password'
      });
    }
  }
};
