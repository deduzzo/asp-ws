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
    OTP_SETUP: 'OTP_SETUP',
    OTP_VERIFY_SETUP: 'OTP_VERIFY_SETUP',
    OTP_SWITCH: 'OTP_SWITCH',
    CAMBIO_PASSWORD: 'CAMBIO_PASSWORD',
    MPI_CREATE: 'MPI_CREATE',
    MPI_UPDATE: 'MPI_UPDATE',
    MPI_LINK: 'MPI_LINK',
    MPI_ANNULLA: 'MPI_ANNULLA',
    MPI_ADMIN: 'MPI_ADMIN',
  }
};
