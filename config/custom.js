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

module.exports.custom = {
  baseUrl: 'http://localhost:1337',
  jwtSecret: jwtConfig.JWT_SECRET,
  jwtExpiresIn: '1h',
  jwtRefreshTokenExpiresIn: '1d',
  total_assistiti: 0,
  /***************************************************************************
  *                                                                          *
  * Any other custom config this Sails app should use during development.    *
  *                                                                          *
  ***************************************************************************/
  // sendgridSecret: 'SG.fake.3e0Bn0qSQVnwb1E4qNPz9JZP5vLZYqjh7sn8S93oSHU',
  // stripeSecret: 'sk_test_Zzd814nldl91104qor5911gjald',
  // …

};
