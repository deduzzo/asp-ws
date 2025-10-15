/**
 * forms/view-form.js
 *
 * @description :: Render the dynamic form view page
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const path = require('path');
const fs = require('fs');

module.exports = {

  friendlyName: 'View form',

  description: 'Display the dynamic form view page',

  inputs: {
    id: {
      type: 'string',
      required: true,
      description: 'The unique identifier of the form',
      regex: /^[a-z0-9-]+$/,
      maxLength: 100
    }
  },

  exits: {
    success: {
      viewTemplatePath: 'pages/forms/view-form'
    },
    notFound: {
      description: 'Form not found',
      responseType: 'notFound'
    }
  },

  fn: async function (inputs, exits) {

    try {
      // Construct the path to the form JSON file
      const formPath = path.join(sails.config.appPath, 'api', 'data', 'forms', `${inputs.id}.json`);

      // Check if file exists
      if (!fs.existsSync(formPath)) {
        return exits.notFound();
      }

      // Read and parse the form to get the title
      const formData = fs.readFileSync(formPath, 'utf8');
      let formDefinition;
      try {
        formDefinition = JSON.parse(formData);
      } catch (parseError) {
        sails.log.error('Error parsing form JSON:', parseError);
        return exits.notFound();
      }

      // Log the view request
      await sails.helpers.log.with({
        level: 'info',
        tag: 'FORMS',
        action: 'VIEW_FORM',
        msg: `Form page viewed: ${inputs.id}`,
        ip: this.req.ip,
        context: { formId: inputs.id }
      });

      // Respond with view
      return exits.success({
        formId: inputs.id,
        formTitle: formDefinition.title || 'Form',
        formDescription: formDefinition.description || '',
        recaptchaEnabled: formDefinition.recaptcha?.enabled || false,
        recaptchaSiteKey: sails.config.custom.recaptcha?.siteKey || ''
      });

    } catch (error) {
      sails.log.error('Error in view-form:', error);
      return exits.notFound();
    }

  }

};
