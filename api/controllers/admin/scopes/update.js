/**
 * Admin scopes update controller
 */

module.exports = {
  friendlyName: 'Update scope',
  description: 'Update an existing scope.',
  swagger: false,
  inputs: {
    id: {
      type: 'number',
      required: true,
      description: 'Scope ID to update'
    },
    scopo: {
      type: 'string',
      description: 'Scope name/identifier'
    },
    attivo: {
      type: 'boolean',
      description: 'Whether scope is active'
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

      // Check if new scope name already exists (if changing name)
      if (inputs.scopo && inputs.scopo !== existingScope.scopo) {
        const duplicateScope = await Auth_Scopi.findOne({
          scopo: inputs.scopo,
          id: { '!=': inputs.id }
        });
        if (duplicateScope) {
          return this.res.ApiResponse({
            errType: 'SCOPE_EXISTS',
            errMsg: 'Uno scopo con questo nome esiste già'
          });
        }
      }

      // Prepare update data
      const updateData = {};
      if (inputs.scopo !== undefined) updateData.scopo = inputs.scopo;
      if (inputs.attivo !== undefined) updateData.attivo = inputs.attivo;

      // Update scope
      const updatedScope = await Auth_Scopi.updateOne({ id: inputs.id })
        .set(updateData);

      // Get user count
      const userCount = await Auth_UtentiScopi.count({ scopo: inputs.id });

      await sails.helpers.log.with({
        level: 'info',
        tag: 'ADMIN',
        azione: 'SCOPE_UPDATED',
        ip: this.req.ip,
        utente: this.req.token ? this.req.token.username : null,
        req: this.req,
        context: { scopeId: inputs.id, changes: Object.keys(updateData) }
      });

      return this.res.ApiResponse({
        data: {
          id: updatedScope.id,
          scopo: updatedScope.scopo,
          attivo: updatedScope.attivo,
          userCount: userCount,
          createdAt: updatedScope.createdAt,
          updatedAt: updatedScope.updatedAt
        }
      });

    } catch (error) {
      sails.log.error('Error updating scope:', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante l\'aggiornamento dello scopo'
      });
    }
  }
};
