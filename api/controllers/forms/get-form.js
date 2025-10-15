/**
 * forms/get-form.js
 *
 * @description :: Get a dynamic form definition by ID
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const path = require('path');
const fs = require('fs');

module.exports = {

  friendlyName: 'Get form',

  description: 'Retrieve a dynamic form definition by its ID',

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
      description: 'Form definition retrieved successfully'
    },
    notFound: {
      description: 'Form not found',
      responseType: 'notFound'
    },
    invalidFormat: {
      description: 'Form JSON is invalid',
      responseType: 'badRequest'
    }
  },

  fn: async function (inputs, exits) {

    try {
      // Construct the path to the form JSON file
      const formPath = path.join(sails.config.appPath, 'api', 'data', 'forms', `${inputs.id}.json`);

      // Check if file exists
      if (!fs.existsSync(formPath)) {
        return exits.notFound({
          error: 'Form not found',
          message: `No form found with id: ${inputs.id}`
        });
      }

      // Read the file
      const formData = fs.readFileSync(formPath, 'utf8');

      // Parse JSON
      let formDefinition;
      try {
        formDefinition = JSON.parse(formData);
      } catch (parseError) {
        sails.log.error('Error parsing form JSON:', parseError);
        return exits.invalidFormat({
          error: 'Invalid form format',
          message: 'The form definition contains invalid JSON'
        });
      }

      // Validate that the form has required fields
      if (!formDefinition.id || !formDefinition.title || !formDefinition.pages) {
        return exits.invalidFormat({
          error: 'Invalid form structure',
          message: 'The form must contain id, title, and pages properties'
        });
      }

      // Verify that the form ID matches the requested ID
      if (formDefinition.id !== inputs.id) {
        sails.log.warn(`Form ID mismatch: requested ${inputs.id}, found ${formDefinition.id}`);
      }

      // Log the request
      await sails.helpers.log.with({
        level: 'info',
        tag: 'FORMS',
        action: 'GET_FORM',
        message: `Form retrieved: ${inputs.id}`,
        ipAddress: this.req.ip,
        context: { formId: inputs.id }
      });

      // Return the form definition
      return exits.success({
        ok: true,
        data: formDefinition
      });

    } catch (error) {
      sails.log.error('Error in get-form:', error);
      return exits.error({
        error: 'Server error',
        message: 'An error occurred while retrieving the form'
      });
    }

  }

};
