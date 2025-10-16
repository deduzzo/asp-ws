/**
 * forms/update-global-settings.js
 *
 * @description :: Update global forms settings
 */

module.exports = {

  friendlyName: 'Update global settings',

  description: 'Update global forms settings (logo, theme, etc.)',

  inputs: {
    logo: {
      type: 'json',
      description: 'Logo configuration'
    },
    defaultTheme: {
      type: 'string',
      description: 'Default theme for forms'
    },
    globalMessages: {
      type: 'json',
      description: 'Global messages configuration'
    }
  },

  exits: {
    success: {
      description: 'Settings updated successfully'
    }
  },

  fn: async function (inputs, exits) {
    try {
      // Load current settings
      const currentSettings = await sails.helpers.formsSettings.with({
        action: 'get'
      });

      // Merge with new settings
      const newSettings = {
        logo: inputs.logo || currentSettings.logo,
        defaultTheme: inputs.defaultTheme || currentSettings.defaultTheme,
        globalMessages: inputs.globalMessages || currentSettings.globalMessages
      };

      // Save updated settings
      await sails.helpers.formsSettings.with({
        action: 'update',
        settings: newSettings
      });

      return this.res.ApiResponse({
        data: {
          message: 'Impostazioni aggiornate con successo',
          settings: newSettings
        }
      });

    } catch (err) {
      sails.log.error('Error updating global settings:', err);
      return this.res.ApiResponse({
        errType: 'SERVER_ERROR',
        errMsg: 'Error updating settings'
      });
    }
  }

};
