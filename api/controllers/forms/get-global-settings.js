/**
 * forms/get-global-settings.js
 *
 * @description :: Get global forms settings
 */

module.exports = {

  friendlyName: 'Get global settings',

  description: 'Retrieve global forms settings (logo, theme, etc.)',

  exits: {
    success: {
      description: 'Settings retrieved successfully'
    }
  },

  fn: async function (inputs, exits) {
    try {
      // Load global settings using helper
      const settings = await sails.helpers.formsSettings.with({
        action: 'get'
      });

      return this.res.ApiResponse({
        data: settings
      });

    } catch (err) {
      sails.log.error('Error getting global settings:', err);
      return this.res.ApiResponse({
        errType: 'SERVER_ERROR',
        errMsg: 'Error loading settings'
      });
    }
  }

};
