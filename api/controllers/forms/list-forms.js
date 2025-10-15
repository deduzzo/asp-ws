/**
 * forms/list-forms.js
 *
 * @description :: List all available dynamic forms
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const path = require('path');
const fs = require('fs');

module.exports = {

  friendlyName: 'List forms',

  description: 'Get a list of all available dynamic forms',

  inputs: {},

  exits: {
    success: {
      description: 'Forms list retrieved successfully'
    }
  },

  fn: async function (inputs, exits) {

    try {
      const formsDir = path.join(sails.config.appPath, 'api', 'data', 'forms');

      // Check if directory exists
      if (!fs.existsSync(formsDir)) {
        return exits.success({
          ok: true,
          data: []
        });
      }

      // Read all files in the directory
      const files = fs.readdirSync(formsDir);

      // Filter only JSON files and read their metadata
      const forms = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(formsDir, file);
            const fileData = fs.readFileSync(filePath, 'utf8');
            const formData = JSON.parse(fileData);

            forms.push({
              id: formData.id,
              title: formData.title || 'Untitled Form',
              description: formData.description || '',
              pages: formData.pages ? formData.pages.length : 0,
              theme: formData.theme || 'modern',
              recaptchaEnabled: formData.recaptcha?.enabled || false,
              url: `/forms/${formData.id}`
            });
          } catch (parseError) {
            sails.log.warn(`Could not parse form file ${file}:`, parseError.message);
          }
        }
      }

      // Sort by ID
      forms.sort((a, b) => a.id.localeCompare(b.id));

      // Log the request
      await sails.helpers.log.with({
        level: 'info',
        tag: 'FORMS',
        action: 'LIST_FORMS',
        msg: `Forms list retrieved: ${forms.length} forms found`,
        ip: this.req.ip,
        context: { count: forms.length }
      });

      return exits.success({
        ok: true,
        data: forms
      });

    } catch (error) {
      sails.log.error('Error in list-forms:', error);
      return exits.error({
        error: 'Server error',
        message: 'An error occurred while retrieving the forms list'
      });
    }

  }

};
