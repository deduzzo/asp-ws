/**
 * Admin scopes delete controller
 */

module.exports = {
  friendlyName: 'Delete scope',
  description: 'Delete a scope and remove it from all users.',
  swagger: false,
  inputs: {
    id: {
      type: 'number',
      required: true,
      description: 'Scope ID to delete'
    }


  },
  fn: async function (inputs, exits) {
    try {
      // Find existing scope
      const existingScope = await Auth_Scopi.findOne({ id: inputs.id });
      if (!existingScope) {
        return this.res.ApiResponse({
          errType: 'NOT_FOUND',
          errMsg: 'Scopo non trovato'
        });
      }

      // Check if this is a critical scope that should not be deleted
      const criticalScopes = ['admin-manage', 'asp5-anagrafica'];
      if (criticalScopes.includes(existingScope.scopo)) {
        return this.res.ApiResponse({
          errType: 'VALIDATION_ERROR',
          errMsg: 'Questo scopo è critico per il sistema e non può essere eliminato'
        });
      }

      // Get count of affected users for logging
      const affectedUserCount = await Auth_UtentiScopi.count({ scopo: inputs.id });

      // Remove scope from all users first
      await Auth_UtentiScopi.destroy({ scopo: inputs.id });

      // Delete the scope
      await Auth_Scopi.destroyOne({ id: inputs.id });

      await sails.helpers.log.with({
        level: 'warn',
        tag: 'ADMIN',
        azione: 'SCOPE_DELETED',
        ip: this.req.ip,
        utente: this.req.token ? this.req.token.username : null,
        req: this.req,
        context: {
          deletedScopeId: inputs.id,
          deletedScope: existingScope.scopo,
          affectedUsers: affectedUserCount
        }
      });

      return this.res.ApiResponse({
        data: {
          message: 'Scopo eliminato con successo',
          deletedScope: {
            id: existingScope.id,
            scopo: existingScope.scopo
          },
          affectedUsers: affectedUserCount
        }
      });

    } catch (error) {
      sails.log.error('Error deleting scope:', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante l\'eliminazione dello scopo'
      });
    }
  }
};
