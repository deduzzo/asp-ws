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
      return this.res.ApiResponse({
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
        level: 'warn',
        tag: 'FORMS_ADMIN',
        message: `Delete submission ${submissionId} from form ${formId}`,
        action: `delete_submission_${formId}`,
        ipAddress: this.req.ip,
        user: this.req.user ? this.req.user.id : null,
        context: {
          formId: formId,
          submissionId: submissionId
        }
      });

      return this.res.ApiResponse({
        data: {
          success: true,
          message: 'Submission eliminata con successo'
        }
      });

    } catch (err) {
      sails.log.error('Error deleting submission:', err);
      return this.res.ApiResponse({
        errType: 'SERVER_ERROR',
        errMsg: 'Error deleting submission'
      });
    }
  }


};
