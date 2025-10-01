/**
 * Admin domains update controller
 */

module.exports = {
  friendlyName: 'Update domain',
  description: 'Update an existing domain/ambito.',
  swagger: false,
  inputs: {
    id: {
      type: 'number',
      required: true,
      description: 'Domain ID to update'
    },
    ambito: {
      type: 'string',
      description: 'Domain/ambito name'
    },
    is_dominio: {
      type: 'boolean',
      description: 'Whether this is a domain for AD/LDAP login'
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

      // Check if new domain name already exists (if changing name)
      if (inputs.ambito && inputs.ambito !== existingDomain.ambito) {
        const duplicateDomain = await Auth_Ambiti.findOne({
          ambito: inputs.ambito,
          id: { '!=': inputs.id }
        });
        if (duplicateDomain) {
          return this.res.ApiResponse({
            errType: 'DOMAIN_EXISTS',
            errMsg: 'Un ambito con questo nome esiste già'
          });
        }
      }

      // Prepare update data
      const updateData = {};
      if (inputs.ambito !== undefined) updateData.ambito = inputs.ambito;
      if (inputs.is_dominio !== undefined) updateData.is_dominio = inputs.is_dominio;

      // Update domain
      const updatedDomain = await Auth_Ambiti.updateOne({ id: inputs.id })
        .set(updateData);

      // Get user count
      const userCount = await Auth_Utenti.count({ ambito: inputs.id });

      await sails.helpers.log.with({
        level: 'info',
        tag: 'ADMIN',
        message: 'Domain updated successfully',
        action: 'DOMAIN_UPDATED',
        ipAddress: this.req.ip,
        user: this.req.user || "null",
        context: { domainId: inputs.id, changes: Object.keys(updateData) }
      });

      return this.res.ApiResponse({
        data: {
          id: updatedDomain.id,
          ambito: updatedDomain.ambito,
          is_dominio: updatedDomain.is_dominio,
          userCount: userCount,
          createdAt: updatedDomain.createdAt,
          updatedAt: updatedDomain.updatedAt
        }
      });

    } catch (error) {
      sails.log.error('Error updating domain:', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante l\'aggiornamento dell\'ambito'
      });
    }
  }
};
