// api/models/Log.js
module.exports = {
  datastore: 'log',
  attributes: {
    level: {
      type: 'string',
      required: true,
      isIn: ['info', 'warn', 'error', 'debug']
    },
    tag: {
      type: 'string',
    },
    message: {
      type: 'string',
      required: true
    },
    action: {
      type: 'string'
    },
    user: {
      type: 'string',
      allowNull: true
    },
    context: {
      type: 'json',
    },
    ipAddress: {
      type: 'string',
      allowNull: true
    },
  },
  TAGS: {
    TOKEN_VERIFY_OK: 'TOKEN_VERIFY_OK',
    TOKEN_VERIFY_KO: 'TOKEN_VERIFY_KO',
    TOKEN_REQUEST_OK: 'TOKEN_REQUEST_OK',
    TOKEN_REQUEST_KO: 'TOKEN_REQUEST_KO',
    API_RESPONSE_OK: 'API_RESPONSE_OK',
    API_RESPONSE_KO: 'API_RESPONSE_KO',
    ADMIN: 'ADMIN',
    FORMS: 'FORMS',
    FORMS_ADMIN: 'FORMS_ADMIN',
    FORM_SUBMISSION: 'FORM_SUBMISSION',
    FORM_SUBMISSION_ERROR: 'FORM_SUBMISSION_ERROR',
  }
};
