/**
 * Admin domains delete controller
 */

module.exports = {
  friendlyName: 'Delete domain',
  description: 'Delete a domain/ambito and all associated users.',
  swagger: false,
  inputs: {
    id: {
      type: 'number',
      required: true,
      description: 'Domain ID to delete'
    }


  },
  fn: async function (inputs, exits) {
    try {
      // Find existing domain
      const existingDomain = await Auth_Ambiti.findOne({ id: inputs.id });
      if (!existingDomain) {
        return this.res.ApiResponse({
          errType: 'NOT_FOUND',
          errMsg: 'Ambito non trovato'
        });
      }

      // Check if this is a critical domain that should not be deleted
      const criticalDomains = ['api', 'asp.messina.it', 'globale'];
      if (criticalDomains.includes(existingDomain.ambito)) {
        return this.res.ApiResponse({
          errType: 'VALIDATION_ERROR',
          errMsg: 'Questo ambito è critico per il sistema e non può essere eliminato'
        });
      }

      // Check if there are users in this domain
      const usersInDomain = await Auth_Utenti.count({ ambito: inputs.id });
      if (usersInDomain > 0) {
        return this.res.ApiResponse({
          errType: 'VALIDATION_ERROR',
          errMsg: `Non è possibile eliminare questo ambito perché contiene ${usersInDomain} utent${usersInDomain > 1 ? 'i' : 'e'}`
        });
      }

      // Delete the domain
      await Auth_Ambiti.destroyOne({ id: inputs.id });

      await sails.helpers.log.with({
        level: 'warn',
        tag: 'ADMIN',
        azione: 'DOMAIN_DELETED',
        ip: this.req.ip,
        utente: this.req.token ? this.req.token.username : null,
        req: this.req,
        context: {
          deletedDomainId: inputs.id,
          deletedDomain: existingDomain.ambito
        }
      });

      return this.res.ApiResponse({
        data: {
          message: 'Ambito eliminato con successo',
          deletedDomain: {
            id: existingDomain.id,
            ambito: existingDomain.ambito
          }
        }
      });

    } catch (error) {
      sails.log.error('Error deleting domain:', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante l\'eliminazione dell\'ambito'
      });
    }
  }
};
