/**
 * forms/update-form-definition.js
 *
 * @description :: Update form definition (structure, fields, pages)
 */

const path = require('path');
const fs = require('fs');

module.exports = {

  friendlyName: 'Update form definition',

  description: 'Update the complete form definition JSON',

  inputs: {
    formId: {
      type: 'string',
      required: true
    }
  },

  exits: {
    success: {
      description: 'Form updated successfully'
    },
    badRequest: {
      description: 'Invalid form data',
      responseType: 'badRequest'
    }
  },

  fn: async function (inputs, exits) {
    try {
      // Get form data from request body
      const formData = this.req.body;

      // Validate basic structure
      if (!formData.id || !formData.title || !formData.pages) {
        return exits.badRequest({
          error: 'Invalid form structure. Required: id, title, pages'
        });
      }

      // Path to form template
      const templateDir = path.join(sails.config.appPath, 'api', 'data', 'forms', 'template');
      const formPath = path.join(templateDir, `${inputs.formId}.json`);

      // Ensure directory exists
      if (!fs.existsSync(templateDir)) {
        fs.mkdirSync(templateDir, { recursive: true });
      }

      // Write updated form
      fs.writeFileSync(formPath, JSON.stringify(formData, null, 2), 'utf8');

      // Log the update
      await sails.helpers.log.with({
        level: 'info',
        tag: 'FORMS_ADMIN',
        message: `Form definition updated: ${inputs.formId}`,
        action: `update_form_definition_${inputs.formId}`,
        ipAddress: this.req.ip,
        user: this.req.user ? this.req.user.id : undefined,
        context: {
          formId: inputs.formId,
          pagesCount: formData.pages.length,
          fieldsCount: formData.pages.reduce((sum, page) => sum + (page.fields?.length || 0), 0)
        }
      });

      return this.res.ApiResponse({
        data: {
          success: true,
          message: 'Form aggiornato con successo',
          formId: inputs.formId
        }
      });

    } catch (err) {
      sails.log.error('Error updating form definition:', err);
      return this.res.ApiResponse({
        errType: 'SERVER_ERROR',
        errMsg: 'Error updating form'
      });
    }
  }

};
