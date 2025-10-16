/**
 * forms/create-form.js
 *
 * @description :: Render the form editor interface for creating a new form
 */

module.exports = {

  friendlyName: 'Create new form',

  description: 'Display the form editor interface for creating a new form',

  inputs: {},

  exits: {
    success: {
      description: 'Editor displayed successfully'
    }
  },

  fn: async function (inputs, exits) {
    try {
      // Generate a unique ID for the new form
      const newFormId = 'form-' + Date.now();

      // Create an empty form template
      const emptyFormTemplate = {
        id: newFormId,
        title: 'Nuovo Form',
        description: 'Inserisci una descrizione per questo form',
        enabled: true,
        theme: 'modern',
        pages: [
          {
            id: 'page-1',
            title: 'Prima Pagina',
            description: 'Descrizione della prima pagina',
            requireAllBeforeNext: false,
            fields: []
          }
        ],
        recaptcha: {
          enabled: false,
          action: 'submit_form'
        }
      };

      // Log the editor access
      await sails.helpers.log.with({
        level: 'info',
        tag: 'FORMS_ADMIN',
        message: `New form editor opened`,
        action: 'OPEN_NEW_FORM_EDITOR',
        ipAddress: this.req.ip,
        user: this.req.user ? this.req.user.id : undefined,
        context: { newFormId }
      });

      // Render the editor view with the empty template
      return this.res.view('pages/forms/form-editor', {
        layout: false,
        formId: newFormId,
        formDefinition: JSON.stringify(emptyFormTemplate)
      });

    } catch (error) {
      sails.log.error('Error in create-form:', error);
      return this.res.serverError('Unable to open form editor');
    }
  }

};
