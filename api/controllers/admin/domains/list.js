/**
 * Admin domains list controller
 */

module.exports = {
  friendlyName: 'List domains',
  description: 'List all available domains/ambiti.',
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
      description: 'Number of domains per page'
    },
    search: {
      type: 'string',
      description: 'Search term for filtering domains'
    }


  },
  fn: async function (inputs, exits) {
    try {
      const { page, limit, search } = inputs;
      const skip = (page - 1) * limit;

      let criteria = {};
      if (search) {
        criteria.ambito = { contains: search };
      }

      const domains = await Auth_Ambiti.find({
        where: criteria,
        skip: skip,
        limit: limit,
        sort: 'ambito ASC'
      });

      const totalCount = await Auth_Ambiti.count(criteria);

      // Get user count for each domain
      const domainsWithUserCount = await Promise.all(domains.map(async (domain) => {
        const userCount = await Auth_Utenti.count({ ambito: domain.id });
        return {
          id: domain.id,
          ambito: domain.ambito,
          is_dominio: domain.is_dominio,
          userCount: userCount,
          createdAt: domain.createdAt,
          updatedAt: domain.updatedAt
        };
      }));

      return this.res.ApiResponse({
        data: {
          domains: domainsWithUserCount,
          pagination: {
            page,
            limit,
            total: totalCount,
            pages: Math.ceil(totalCount / limit)
          }
        }
      });

    } catch (error) {
      sails.log.error('Error listing domains:', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante il recupero degli ambiti'
      });
    }
  }
};
