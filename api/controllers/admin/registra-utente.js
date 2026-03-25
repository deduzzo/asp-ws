/**
 * @swagger
 *
 * /registra-utente:
 *   tags:
 *     - Admin
 */

const {ERROR_TYPES} = require('../../responses/ApiResponse');
const crypto = require('crypto');

module.exports = {
  friendlyName: 'Admin registra utente',
  description: 'Registra un nuovo utente con username, mail, ambito e scopi. La password viene generata automaticamente e restituita.',
  inputs: {
    username: {
      type: 'string',
      required: true,
      description: 'Username per il nuovo utente'
    },
    mail: {
      type: 'string',
      required: true,
      isEmail: true,
      description: 'Indirizzo email del nuovo utente'
    },
    ambito: {
      type: 'number',
      required: true,
      description: 'ID dell\'ambito da assegnare'
    },
    livello: {
      type: 'number',
      required: true,
      description: 'ID del livello di accesso da assegnare'
    },
    scopi: {
      type: 'ref',
      defaultsTo: [],
      description: 'Array di ID degli scopi da assegnare'
    },
    allow_domain_login: {
      type: 'boolean',
      defaultsTo: false,
      description: 'Se abilitare il login tramite dominio (Active Directory)'
    },
    domain: {
      type: 'string',
      allowNull: true,
      description: 'Dominio per login AD (es. asp.messina.it). Richiesto se allow_domain_login è true.'
    }
  },

  fn: async function (inputs) {
    try {
      // Verifica username unico
      const existingUser = await Auth_Utenti.findOne({username: inputs.username});
      if (existingUser) {
        return this.res.ApiResponse({
          errType: ERROR_TYPES.GIA_PRESENTE,
          errMsg: 'Un utente con questo username esiste già'
        });
      }

      // Validazione dominio
      if (inputs.allow_domain_login && !inputs.domain) {
        return this.res.ApiResponse({
          errType: ERROR_TYPES.ERRORE_GENERICO,
          errMsg: 'Il dominio è richiesto per il login con dominio'
        });
      }

      // Genera password forte: 16 caratteri
      const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const lower = 'abcdefghijklmnopqrstuvwxyz';
      const digits = '0123456789';
      const special = '!@#$%^&*()-_=+[]{}|;:,.<>?';
      const all = upper + lower + digits + special;

      let chars = [
        upper[crypto.randomInt(upper.length)],
        lower[crypto.randomInt(lower.length)],
        digits[crypto.randomInt(digits.length)],
        special[crypto.randomInt(special.length)]
      ];

      for (let i = chars.length; i < 16; i++) {
        chars.push(all[crypto.randomInt(all.length)]);
      }

      for (let i = chars.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
      }

      const password = chars.join('');
      const hashPassword = await sails.helpers.passwords.hashPassword(password);

      // Crea utente
      const newUser = await Auth_Utenti.create({
        username: inputs.username,
        mail: inputs.mail,
        hash_password: inputs.allow_domain_login ? null : hashPassword,
        allow_domain_login: inputs.allow_domain_login,
        domain: inputs.domain || null,
        ambito: inputs.ambito,
        livello: inputs.livello,
        attivo: true,
        otp_enabled: false,
        otp_type: null,
        otp_required: false,
        otp: null,
        otp_exp: null,
        otp_key: null
      }).fetch();

      // Associa scopi
      if (inputs.scopi && inputs.scopi.length > 0) {
        for (const scopoId of inputs.scopi) {
          await Auth_UtentiScopi.create({
            utente: newUser.id,
            scopo: scopoId
          });
        }
      }

      // Recupera dati completi con populate
      const completeUser = await Auth_Utenti.findOne({id: newUser.id})
        .populate('ambito')
        .populate('livello')
        .populate('scopi');

      await sails.helpers.log.with({
        level: 'info',
        tag: 'ADMIN',
        message: `Nuovo utente registrato: ${inputs.username} (id: ${newUser.id})`,
        action: 'ADMIN_REGISTRA_UTENTE',
        ipAddress: this.req.ip,
        user: this.req.tokenData.username,
        context: {newUserId: newUser.id, username: inputs.username}
      });

      const risposta = {
        id: completeUser.id,
        username: completeUser.username,
        mail: completeUser.mail,
        domain: completeUser.domain,
        allow_domain_login: completeUser.allow_domain_login,
        attivo: completeUser.attivo,
        ambito: completeUser.ambito,
        livello: completeUser.livello,
        scopi: completeUser.scopi
      };

      // Restituisci password solo per utenti non di dominio
      if (!inputs.allow_domain_login) {
        risposta.password = password;
      }

      return this.res.ApiResponse({data: risposta});

    } catch (err) {
      sails.log.error('Errore admin registra utente:', err);
      return this.res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: 'Errore durante la registrazione dell\'utente'
      });
    }
  }
};
