/**
 * Admin domains create controller
 */

module.exports = {
  friendlyName: 'Create domain',
  description: 'Create a new domain/ambito.',
  swagger: false,
  inputs: {
    ambito: {
      type: 'string',
      required: true,
      description: 'Domain/ambito name'
    },
    is_dominio: {
      type: 'boolean',
      defaultsTo: false,
      description: 'Whether this is a domain for AD/LDAP login'
    }


  },
  fn: async function (inputs, exits) {
    try {
      // Check if domain already exists
      const existingDomain = await Auth_Ambiti.findOne({ ambito: inputs.ambito });
      if (existingDomain) {
        return this.res.ApiResponse({
          errType: 'DOMAIN_EXISTS',
          errMsg: 'Un ambito con questo nome esiste già'
        });
      }

      // Create domain
      const newDomain = await Auth_Ambiti.create({
        ambito: inputs.ambito,
        is_dominio: inputs.is_dominio
      }).fetch();

      await sails.helpers.log.with({
        level: 'info',
        tag: 'ADMIN',
        message: 'New domain created successfully',
        action: 'DOMAIN_CREATED',
        ipAddress: this.req.ip,
        user: this.req.user || "null",
        context: { newDomainId: newDomain.id, ambito: inputs.ambito }
      });

      return this.res.ApiResponse({
        data: {
          id: newDomain.id,
          ambito: newDomain.ambito,
          is_dominio: newDomain.is_dominio,
          userCount: 0,
          createdAt: newDomain.createdAt,
          updatedAt: newDomain.updatedAt
        }
      });

    } catch (error) {
      sails.log.error('Error creating domain:', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante la creazione dell\'ambito'
      });
    }
  }
};
