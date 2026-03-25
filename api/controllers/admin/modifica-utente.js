/**
 * @swagger
 *
 * /modifica-utente:
 *   tags:
 *     - Admin
 */

const {ERROR_TYPES} = require('../../responses/ApiResponse');

module.exports = {
  friendlyName: 'Admin modifica utente',
  description: 'Modifica gli scopi assegnati a un utente. La chiave utente è username+ambito, quindi ambito e username non sono modificabili.',
  inputs: {
    id: {
      type: 'number',
      required: true,
      description: 'ID dell\'utente da modificare (ottenibile da /admin-op/search-user)'
    },
    scopi: {
      type: 'ref',
      required: true,
      description: 'Nuovo array completo di ID degli scopi da assegnare. Sostituisce tutti gli scopi precedenti.'
    }
  },

  fn: async function (inputs) {
    try {
      const utente = await Auth_Utenti.findOne({id: inputs.id})
        .populate('ambito')
        .populate('livello')
        .populate('scopi');

      if (!utente) {
        return this.res.ApiResponse({
          errType: ERROR_TYPES.NON_TROVATO,
          errMsg: 'Utente non trovato'
        });
      }

      // Verifica che sia un array
      if (!Array.isArray(inputs.scopi)) {
        return this.res.ApiResponse({
          errType: ERROR_TYPES.ERRORE_GENERICO,
          errMsg: 'Il campo scopi deve essere un array di ID'
        });
      }

      // Verifica che gli scopi esistano
      for (const scopoId of inputs.scopi) {
        const scopoRecord = await Auth_Scopi.findOne({id: scopoId});
        if (!scopoRecord) {
          return this.res.ApiResponse({
            errType: ERROR_TYPES.NON_TROVATO,
            errMsg: `Scopo con id ${scopoId} non trovato`
          });
        }
      }

      // Rimuovi tutte le associazioni scopi esistenti
      await Auth_UtentiScopi.destroy({utente: utente.id});

      // Crea le nuove associazioni
      for (const scopoId of inputs.scopi) {
        await Auth_UtentiScopi.create({
          utente: utente.id,
          scopo: scopoId
        });
      }

      // Recupera dati aggiornati
      const updatedUser = await Auth_Utenti.findOne({id: utente.id})
        .populate('ambito')
        .populate('livello')
        .populate('scopi');

      await sails.helpers.log.with({
        level: 'info',
        tag: 'ADMIN',
        message: `Scopi modificati per utente ${utente.username} (id: ${utente.id})`,
        action: 'ADMIN_MODIFICA_UTENTE',
        ipAddress: this.req.ip,
        user: this.req.tokenData.username,
        context: {
          targetUserId: utente.id,
          targetUsername: utente.username,
          oldScopi: utente.scopi.map(s => s.id),
          newScopi: inputs.scopi
        }
      });

      return this.res.ApiResponse({
        data: {
          id: updatedUser.id,
          username: updatedUser.username,
          mail: updatedUser.mail,
          domain: updatedUser.domain,
          allow_domain_login: updatedUser.allow_domain_login,
          attivo: updatedUser.attivo,
          otp_enabled: updatedUser.otp_enabled,
          otp_type: updatedUser.otp_type,
          otp_required: updatedUser.otp_required,
          ambito: updatedUser.ambito,
          livello: updatedUser.livello,
          scopi: updatedUser.scopi
        }
      });

    } catch (err) {
      sails.log.error('Errore admin modifica utente:', err);
      return this.res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: 'Errore durante la modifica dell\'utente'
      });
    }
  }
};
