/**
 * Admin users list controller
 */

module.exports = {
  friendlyName: 'List users',
  description: 'List all users with their permissions.',
  swagger: false,
  inputs: {
    page: {
      type: 'number',
      defaultsTo: 1,
      description: 'Page number for pagination'
    },
    limit: {
      type: 'number',
      defaultsTo: 20,
      description: 'Number of users per page'
    },
    search: {
      type: 'string',
      description: 'Search term for filtering users'
    }


  },
  fn: async function (inputs, exits) {
    try {
      const { page, limit, search } = inputs;
      const skip = (page - 1) * limit;

      let criteria = {};
      if (search) {
        criteria = {
          or: [
            { username: { contains: search } },
            { mail: { contains: search } }
          ]
        };
      }

      const users = await Auth_Utenti.find({
        where: criteria,
        skip: skip,
        limit: limit,
        sort: 'username ASC'
      })
      .populate('ambito')
      .populate('livello')
      .populate('scopi');

      const totalCount = await Auth_Utenti.count(criteria);

      const usersData = users.map(user => ({
        id: user.id,
        username: user.username,
        mail: user.mail,
        domain: user.domain,
        allow_domain_login: user.allow_domain_login,
        attivo: user.attivo,
        data_disattivazione: user.data_disattivazione,
        token_revocato: user.token_revocato,
        otp_enabled: user.otp_enabled,
        ambito: user.ambito ? {
          id: user.ambito.id,
          ambito: user.ambito.ambito,
          is_dominio: user.ambito.is_dominio
        } : null,
        livello: user.livello ? {
          id: user.livello.id,
          livello: user.livello.livello,
          descrizione: user.livello.descrizione,
          isSuperAdmin: user.livello.isSuperAdmin
        } : null,
        scopi: user.scopi.map(scope => ({
          id: scope.id,
          scopo: scope.scopo,
          attivo: scope.attivo
        }))
      }));

      return this.res.ApiResponse({
        data: {
          users: usersData,
          pagination: {
            page,
            limit,
            total: totalCount,
            pages: Math.ceil(totalCount / limit)
          }
        }
      });

    } catch (error) {
      sails.log.error('Error listing users:', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante il recupero degli utenti'
      });
    }
  }
};
