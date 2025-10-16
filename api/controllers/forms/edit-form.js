/**
 * forms/edit-form.js
 *
 * @description :: Render the form editor interface
 */

const path = require('path');
const fs = require('fs');

module.exports = {

  friendlyName: 'Edit form',

  description: 'Display the form editor interface',

  inputs: {
    id: {
      type: 'string',
      required: true,
      description: 'The unique identifier of the form to edit',
      regex: /^[a-z0-9-]+$/,
      maxLength: 100
    }
  },

  exits: {
    notFound: {
      description: 'Form not found',
      responseType: 'notFound'
    }
  },

  fn: async function (inputs, exits) {
    try {
      // Construct the path to the form JSON file
      const formPath = path.join(sails.config.appPath, 'api', 'data', 'forms', 'template', `${inputs.id}.json`);

      // Check if file exists
      if (!fs.existsSync(formPath)) {
        return exits.notFound();
      }

      // Read and parse the form definition
      const formData = fs.readFileSync(formPath, 'utf8');
      let formDefinition;
      try {
        formDefinition = JSON.parse(formData);
      } catch (parseError) {
        sails.log.error('Error parsing form JSON:', parseError);
        return exits.notFound();
      }

      // Log the editor access
      await sails.helpers.log.with({
        level: 'info',
        tag: 'FORMS_ADMIN',
        message: `Form editor opened: ${inputs.id}`,
        action: 'OPEN_FORM_EDITOR',
        ipAddress: this.req.ip,
        user: this.req.user ? this.req.user.id : undefined,
        context: { formId: inputs.id }
      });

      // Render the editor view
      return this.res.view('pages/forms/form-editor', {
        layout: false,
        formId: inputs.id,
        formDefinition: JSON.stringify(formDefinition)
      });

    } catch (error) {
      sails.log.error('Error in edit-form:', error);
      return exits.notFound();
    }
  }

};
