/**
 * Custom configuration
 * (sails.config.custom)
 *
 * One-off settings specific to your application.
 *
 * For more information on custom configuration, visit:
 * https://sailsjs.com/config/custom
 */

const jwtConfig = require('./custom/private_jwt_config.json');
const indexConfig = require('./custom/private_index.json');

// Load reCAPTCHA config, with fallback for development
let recaptchaConfig;
try {
  recaptchaConfig = require('./custom/private_recaptcha.json');
} catch (error) {
  console.warn('Warning: private_recaptcha.json not found, using placeholder values');
  recaptchaConfig = {
    RECAPTCHA_SITE_KEY: 'your-recaptcha-site-key-here',
    RECAPTCHA_SECRET_KEY: 'your-recaptcha-secret-key-here'
  };
}

module.exports.custom = {
  baseUrl: 'http://localhost:1337',
  jwtSecret: jwtConfig.JWT_SECRET,
  jwtExpiresIn: '1d',
  jwtRefreshTokenExpiresIn: '1w',
  total_assistiti: 0,
  recaptcha: {
    siteKey: recaptchaConfig.RECAPTCHA_SITE_KEY,
    secretKey: recaptchaConfig.RECAPTCHA_SECRET_KEY
  },
  /***************************************************************************
  *                                                                          *
  * Any other custom config this Sails app should use during development.    *
  *                                                                          *
  ***************************************************************************/
  // sendgridSecret: 'SG.fake.3e0Bn0qSQVnwb1E4qNPz9JZP5vLZYqjh7sn8S93oSHU',
  // stripeSecret: 'sk_test_Zzd814nldl91104qor5911gjald',
  // …

};
