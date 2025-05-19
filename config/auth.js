/**
 * Authentication Configuration
 * (sails.config.auth)
 *
 * This file contains the HTTP Basic Authentication credentials for the application.
 * These credentials are used to protect the documentation route (/docs).
 */

module.exports.auth = {
  // HTTP Basic Authentication credentials
  users: {
    'asp': '$Api1234.'
  },

  // Authentication realm
  realm: 'ASP5Ws Documentation',

  // Whether to show the authentication challenge
  challenge: true
};
