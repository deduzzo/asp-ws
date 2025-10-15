module.exports = {


  friendlyName: 'Get submissions',


  description: 'Recupera tutte le submissions di un form (protetto con JWT)',


  inputs: {
    page: {
      type: 'number',
      defaultsTo: 1,
      description: 'Numero di pagina'
    },
    limit: {
      type: 'number',
      defaultsTo: 50,
      description: 'Numero di risultati per pagina'
    },
    startDate: {
      type: 'string',
      description: 'Data inizio filtro (ISO format)'
    },
    endDate: {
      type: 'string',
      description: 'Data fine filtro (ISO format)'
    },
    ipAddress: {
      type: 'string',
      description: 'Filtra per IP address'
    }
  },


  exits: {
    success: {
      description: 'Submissions recuperate con successo'
    },
    notFound: {
      description: 'Form non trovato',
      responseType: 'notFound'
    }
  },


  fn: async function (inputs, exits) {
    const formId = this.req.param('id');

    if (!formId) {
      return this.res.ApiResponse({
        errType: 'BAD_REQUEST',
        errMsg: 'formId is required'
      });
    }

    try {
      // Calcola offset per paginazione
      const offset = (inputs.page - 1) * inputs.limit;

      // Prepara filtri
      const filters = {
        limit: inputs.limit,
        offset: offset
      };

      if (inputs.startDate) {
        filters.startDate = inputs.startDate;
      }
      if (inputs.endDate) {
        filters.endDate = inputs.endDate;
      }
      if (inputs.ipAddress) {
        filters.ipAddress = inputs.ipAddress;
      }

      // Recupera submissions dal database
      const result = await sails.helpers.formDb.with({
        formId: formId,
        action: 'getAll',
        data: filters
      }).intercept('notFound', () => {
        return exits.notFound({ error: 'Form not found' });
      });

      // Log l'accesso
      await sails.helpers.log.with({
        level: 'info',
        tag: 'FORMS_ADMIN',
        message: `Get submissions for form ${formId}`,
        action: `get_submissions_${formId}`,
        ipAddress: this.req.ip,
        user: this.req.user ? this.req.user.id : null,
        context: {
          formId: formId,
          page: inputs.page,
          total: result.total
        }
      });

      return this.res.ApiResponse({
        data: {
          submissions: result.submissions,
          total: result.total,
          page: inputs.page,
          limit: inputs.limit,
          totalPages: Math.ceil(result.total / inputs.limit)
        }
      });

    } catch (err) {
      sails.log.error('Error getting submissions:', err);
      return this.res.ApiResponse({
        errType: 'SERVER_ERROR',
        errMsg: 'Error retrieving submissions'
      });
    }
  }


};
