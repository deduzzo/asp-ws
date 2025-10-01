/**
 * Admin scopes create controller
 */

module.exports = {
  friendlyName: 'Create scope',
  description: 'Create a new scope.',
  swagger: false,
  inputs: {
    scopo: {
      type: 'string',
      required: true,
      description: 'Scope name/identifier'
    },
    attivo: {
      type: 'boolean',
      defaultsTo: true,
      description: 'Whether scope is active'
    }


  },
  fn: async function (inputs, exits) {
    try {
      // Check if scope already exists
      const existingScope = await Auth_Scopi.findOne({ scopo: inputs.scopo });
      if (existingScope) {
        return this.res.ApiResponse({
          errType: 'SCOPE_EXISTS',
          errMsg: 'Uno scopo con questo nome esiste già'
        });
      }

      // Create scope
      const newScope = await Auth_Scopi.create({
        scopo: inputs.scopo,
        attivo: inputs.attivo
      }).fetch();

      await sails.helpers.log.with({
        level: 'info',
        tag: 'ADMIN',
        azione: 'SCOPE_CREATED',
        ip: this.req.ip,
        utente: this.req.token ? this.req.token.username : null,
        req: this.req,
        context: { newScopeId: newScope.id, scopo: inputs.scopo }
      });

      return this.res.ApiResponse({
        data: {
          id: newScope.id,
          scopo: newScope.scopo,
          attivo: newScope.attivo,
          userCount: 0,
          createdAt: newScope.createdAt,
          updatedAt: newScope.updatedAt
        }
      });

    } catch (error) {
      sails.log.error('Error creating scope:', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante la creazione dello scopo'
      });
    }
  }
};
