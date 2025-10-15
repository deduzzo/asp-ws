/**
 * Log_FormSubmission.js
 *
 * @description :: Model for storing dynamic form submissions
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: 'log',
  tableName: 'form_submissions',

  attributes: {

    //  ╔═╗╦═╗╦╔╦╗╦╔╦╗╦╦  ╦╔═╗╔═╗
    //  ╠═╝╠╦╝║║║║║ ║ ║╚╗╔╝║╣ ╚═╗
    //  ╩  ╩╚═╩╩ ╩╩ ╩ ╩ ╚╝ ╚═╝╚═╝

    formId: {
      type: 'string',
      required: true,
      maxLength: 100,
      columnType: 'varchar(100)',
      description: 'The unique identifier of the form (matches the JSON filename)'
    },

    formTitle: {
      type: 'string',
      maxLength: 255,
      columnType: 'varchar(255)',
      description: 'The title of the form at the time of submission'
    },

    submissionData: {
      type: 'json',
      required: true,
      columnType: 'longtext',
      description: 'JSON object containing all form field responses with key-value pairs'
    },

    ipAddress: {
      type: 'string',
      maxLength: 45,
      columnType: 'varchar(45)',
      description: 'IP address of the submitter (supports IPv4 and IPv6)'
    },

    userAgent: {
      type: 'string',
      maxLength: 500,
      columnType: 'varchar(500)',
      description: 'User agent string of the submitter'
    },

    recaptchaScore: {
      type: 'number',
      columnType: 'decimal(3,2)',
      description: 'reCAPTCHA v3 score (0.0 to 1.0) if enabled'
    },

    submittedAt: {
      type: 'ref',
      columnType: 'datetime',
      autoCreatedAt: true,
      description: 'Timestamp of submission'
    },

    //  ╔═╗╔╦╗╔╗ ╔═╗╔╦╗╔═╗
    //  ║╣ ║║║╠╩╗║╣  ║║╚═╗
    //  ╚═╝╩ ╩╚═╝╚═╝═╩╝╚═╝
    // n/a

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝
    // n/a

  },

};
