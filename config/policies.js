/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your actions.
 *
 * For more information on configuring policies, check out:
 * https://sailsjs.com/docs/concepts/policies
 */

module.exports.policies = {

  /***************************************************************************
   *                                                                          *
   * Default policy for all controllers and actions, unless overridden.       *
   * (`true` allows public access)                                            *
   *                                                                          *
   ***************************************************************************/

  'anagrafica/*': ['is-token-verified'],
  'admin/*': ['is-token-verified'],
  'admin/index': true, // Allow public access to admin interface page (auth handled in frontend)
  'cambio-medico/*': ['is-token-verified'],
  //'*': ['logger'],
};
