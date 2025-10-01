/**
 * Admin users update controller
 */

const argon2 = require('argon2');

module.exports = {
  friendlyName: 'Update user',
  description: 'Update an existing user and their permissions.',
  swagger: false,
  inputs: {
    id: {
      type: 'number',
      required: true,
      description: 'User ID to update'
    },
    username: {
      type: 'string',
      description: 'Username for the user'
    },
    mail: {
      type: 'string',
      isEmail: true,
      description: 'Email address for the user'
    },
    password: {
      type: 'string',
      minLength: 6,
      description: 'New password for the user'
    },
    allow_domain_login: {
      type: 'boolean',
      description: 'Whether user can login with domain credentials'
    },
    domain: {
      type: 'string',
      description: 'Domain for domain login users'
    },
    ambito: {
      type: 'number',
      description: 'Domain/ambito ID'
    },
    livello: {
      type: 'number',
      description: 'Access level ID'
    },
    scopi: {
      type: 'ref',
      description: 'Array of scope IDs'
    },
    attivo: {
      type: 'boolean',
      description: 'Whether user is active'
    },
    token_revocato: {
      type: 'boolean',
      description: 'Whether user tokens are revoked'
    }


  },
  fn: async function (inputs, exits) {
    try {
      // Find existing user
      const existingUser = await Auth_Utenti.findOne({ id: inputs.id });
      if (!existingUser) {
        return this.res.ApiResponse({
          errType: 'NOT_FOUND',
          errMsg: 'Utente non trovato'
        });
      }

      // Prepare update data
      const updateData = {};

      if (inputs.username !== undefined) updateData.username = inputs.username;
      if (inputs.mail !== undefined) updateData.mail = inputs.mail;
      if (inputs.allow_domain_login !== undefined) updateData.allow_domain_login = inputs.allow_domain_login;
      if (inputs.domain !== undefined) updateData.domain = inputs.domain;
      if (inputs.ambito !== undefined) updateData.ambito = inputs.ambito;
      if (inputs.livello !== undefined) updateData.livello = inputs.livello;
      if (inputs.attivo !== undefined) updateData.attivo = inputs.attivo;
      if (inputs.token_revocato !== undefined) updateData.token_revocato = inputs.token_revocato;

      // Handle password update
      if (inputs.password) {
        updateData.hash_password = await argon2.hash(inputs.password);
      }

      // Handle deactivation date
      if (inputs.attivo === false && existingUser.attivo === true) {
        updateData.data_disattivazione = Date.now();
      } else if (inputs.attivo === true && existingUser.attivo === false) {
        updateData.data_disattivazione = null;
      }

      // Update user
      const updatedUser = await Auth_Utenti.updateOne({ id: inputs.id })
        .set(updateData);

      // Update scopes if provided
      if (inputs.scopi !== undefined) {
        // Remove existing scope associations
        await Auth_UtentiScopi.destroy({ utente: inputs.id });

        // Add new scope associations
        if (inputs.scopi && inputs.scopi.length > 0) {
          for (const scopoId of inputs.scopi) {
            await Auth_UtentiScopi.create({
              utente: inputs.id,
              scopo: scopoId
            });
          }
        }
      }

      // Fetch complete updated user data
      const completeUser = await Auth_Utenti.findOne({ id: inputs.id })
        .populate('ambito')
        .populate('livello')
        .populate('scopi');

      await sails.helpers.log.with({
        level: 'info',
        tag: 'ADMIN',
        azione: 'USER_UPDATED',
        ip: this.req.ip,
        utente: this.req.token ? this.req.token.username : null,
        req: this.req,
        context: { userId: inputs.id, changes: Object.keys(updateData) }
      });

      return this.res.ApiResponse({
        data: {
          id: completeUser.id,
          username: completeUser.username,
          mail: completeUser.mail,
          domain: completeUser.domain,
          allow_domain_login: completeUser.allow_domain_login,
          attivo: completeUser.attivo,
          data_disattivazione: completeUser.data_disattivazione,
          token_revocato: completeUser.token_revocato,
          ambito: completeUser.ambito,
          livello: completeUser.livello,
          scopi: completeUser.scopi
        }
      });

    } catch (error) {
      sails.log.error('Error updating user:', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante l\'aggiornamento dell\'utente'
      });
    }
  }
};
