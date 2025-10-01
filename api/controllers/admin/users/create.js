
const argon2 = require('argon2');

module.exports = {
  friendlyName: 'Create user',
  description: 'Create a new user with specified permissions.',
  swagger: false,
  inputs: {
    username: {
      type: 'string',
      required: true,
      description: 'Username for the new user'
    },
    mail: {
      type: 'string',
      required: true,
      isEmail: true,
      description: 'Email address for the new user'
    },
    password: {
      type: 'string',
      minLength: 6,
      description: 'Password for the new user (if not using domain login)'
    },
    allow_domain_login: {
      type: 'boolean',
      defaultsTo: false,
      description: 'Whether user can login with domain credentials'
    },
    domain: {
      type: 'string',
      description: 'Domain for domain login users'
    },
    ambito: {
      type: 'number',
      required: true,
      description: 'Domain/ambito ID'
    },
    livello: {
      type: 'number',
      required: true,
      description: 'Access level ID'
    },
    scopi: {
      type: 'ref',
      defaultsTo: [],
      description: 'Array of scope IDs'
    },
    attivo: {
      type: 'boolean',
      defaultsTo: true,
      description: 'Whether user is active'
    }


  },
  fn: async function (inputs, exits) {
    try {
      // Check if user already exists
      const existingUser = await Auth_Utenti.findOne({ username: inputs.username });
      if (existingUser) {
        return this.res.ApiResponse({
          errType: 'USER_EXISTS',
          errMsg: 'Un utente con questo username esiste già'
        });
      }

      // Hash password if provided
      let hashPassword = null;
      if (inputs.password && !inputs.allow_domain_login) {
        hashPassword = await argon2.hash(inputs.password);
      }

      // Validate domain requirement
      if (inputs.allow_domain_login && !inputs.domain) {
        return this.res.ApiResponse({
          errType: 'VALIDATION_ERROR',
          errMsg: 'Il dominio è richiesto per il login con dominio'
        });
      }

      // Create user
      const newUser = await Auth_Utenti.create({
        username: inputs.username,
        mail: inputs.mail,
        hash_password: hashPassword,
        allow_domain_login: inputs.allow_domain_login,
        domain: inputs.domain,
        ambito: inputs.ambito,
        livello: inputs.livello,
        attivo: inputs.attivo
      }).fetch();

      // Associate scopes if provided
      if (inputs.scopi && inputs.scopi.length > 0) {
        for (const scopoId of inputs.scopi) {
          await Auth_UtentiScopi.create({
            utente: newUser.id,
            scopo: scopoId
          });
        }
      }

      // Fetch complete user data
      const completeUser = await Auth_Utenti.findOne({ id: newUser.id })
        .populate('ambito')
        .populate('livello')
        .populate('scopi');

      await sails.helpers.log.with({
        level: 'info',
        tag: 'ADMIN',
        azione: 'USER_CREATED',
        ip: this.req.ip,
        utente: this.req.token ? this.req.token.username : null,
        req: this.req,
        context: { newUserId: newUser.id, username: inputs.username }
      });

      return this.res.ApiResponse({
        data: {
          id: completeUser.id,
          username: completeUser.username,
          mail: completeUser.mail,
          domain: completeUser.domain,
          allow_domain_login: completeUser.allow_domain_login,
          attivo: completeUser.attivo,
          ambito: completeUser.ambito,
          livello: completeUser.livello,
          scopi: completeUser.scopi
        }
      });

    } catch (error) {
      sails.log.error('Error creating user:', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante la creazione dell\'utente'
      });
    }
  }
};
