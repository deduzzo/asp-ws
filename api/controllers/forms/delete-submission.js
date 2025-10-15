module.exports = {


  friendlyName: 'Delete submission',


  description: 'Elimina una submission specifica (protetto con JWT)',


  exits: {
    success: {
      description: 'Submission eliminata con successo'
    },
    notFound: {
      description: 'Submission non trovata',
      responseType: 'notFound'
    }
  },


  fn: async function (inputs, exits) {
    const formId = this.req.param('id');
    const submissionId = this.req.param('submissionId');

    if (!formId || !submissionId) {
      return res.ApiResponse({
        errType: 'BAD_REQUEST',
        errMsg: 'formId and submissionId are required'
      });
    }

    try {
      // Elimina la submission
      const result = await sails.helpers.formDb.with({
        formId: formId,
        action: 'delete',
        submissionId: parseInt(submissionId)
      }).intercept('notFound', () => {
        return exits.notFound({ error: 'Submission not found' });
      });

      // Log l'eliminazione
      await sails.helpers.log.with({
        livello: 'warn',
        tag: 'FORMS_ADMIN',
        azione: `Delete submission ${submissionId} from form ${formId}`,
        ip: this.req.ip,
        utente: this.req.user ? this.req.user.id : null,
        contesto: {
          formId: formId,
          submissionId: submissionId
        }
      });

      return res.ApiResponse({
        data: {
          success: true,
          message: 'Submission eliminata con successo'
        }
      });

    } catch (err) {
      sails.log.error('Error deleting submission:', err);
      return res.ApiResponse({
        errType: 'SERVER_ERROR',
        errMsg: 'Error deleting submission'
      });
    }
  }


};
