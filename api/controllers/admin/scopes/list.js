/**
 * Admin scopes list controller
 */

module.exports = {
  friendlyName: 'List scopes',
  description: 'List all available scopes.',
  swagger: false,
  inputs: {
    page: {
      type: 'number',
      defaultsTo: 1,
      description: 'Page number for pagination'
    },
    limit: {
      type: 'number',
      defaultsTo: 50,
      description: 'Number of scopes per page'
    },
    search: {
      type: 'string',
      description: 'Search term for filtering scopes'
    }


  },
  fn: async function (inputs, exits) {
    try {
      const { page, limit, search } = inputs;
      const skip = (page - 1) * limit;

      let criteria = {};
      if (search) {
        criteria.scopo = { contains: search };
      }

      const scopes = await Auth_Scopi.find({
        where: criteria,
        skip: skip,
        limit: limit,
        sort: 'scopo ASC'
      });

      const totalCount = await Auth_Scopi.count(criteria);

      // Get user count for each scope
      const scopesWithUserCount = await Promise.all(scopes.map(async (scope) => {
        const userCount = await Auth_UtentiScopi.count({ scopo: scope.id });
        return {
          id: scope.id,
          scopo: scope.scopo,
          attivo: scope.attivo,
          userCount: userCount,
          createdAt: scope.createdAt,
          updatedAt: scope.updatedAt
        };
      }));

      return this.res.ApiResponse({
        data: {
          scopes: scopesWithUserCount,
          pagination: {
            page,
            limit,
            total: totalCount,
            pages: Math.ceil(totalCount / limit)
          }
        }
      });

    } catch (error) {
      sails.log.error('Error listing scopes:', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante il recupero degli scopi'
      });
    }
  }
};
