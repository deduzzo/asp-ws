/**
 * forms-settings.js
 *
 * @description :: Helper to manage global forms settings (logo, theme, etc.)
 * @help        :: See https://sailsjs.com/docs/concepts/helpers
 */

const fs = require('fs');
const path = require('path');

module.exports = {

  friendlyName: 'Forms settings',

  description: 'Load and manage global forms settings',

  inputs: {
    action: {
      type: 'string',
      required: true,
      description: 'Action to perform: get, update',
      isIn: ['get', 'update']
    },
    settings: {
      type: 'json',
      description: 'Settings object for update action'
    }
  },

  exits: {
    success: {
      description: 'Settings retrieved or updated successfully'
    },
    error: {
      description: 'Error loading or saving settings'
    }
  },

  fn: async function (inputs, exits) {
    const settingsPath = path.join(sails.config.appPath, 'config', 'custom', 'private_forms_settings.json');

    try {
      if (inputs.action === 'get') {
        // Load settings from file
        if (!fs.existsSync(settingsPath)) {
          // Return default settings if file doesn't exist
          return exits.success({
            logo: {
              enabled: false,
              path: '/images/forms/logo.png',
              alt: 'Logo ASP Messina',
              width: 150,
              height: 60
            },
            defaultTheme: 'modern',
            globalMessages: {
              maintenanceMode: false,
              maintenanceMessage: 'I moduli sono temporaneamente non disponibili per manutenzione. Riprova più tardi.'
            }
          });
        }

        const settingsData = fs.readFileSync(settingsPath, 'utf8');
        const settings = JSON.parse(settingsData);
        return exits.success(settings);

      } else if (inputs.action === 'update') {
        // Update settings
        if (!inputs.settings) {
          return exits.error({ error: 'Settings object is required for update' });
        }

        // Write settings to file
        fs.writeFileSync(settingsPath, JSON.stringify(inputs.settings, null, 2), 'utf8');

        // Log the update
        await sails.helpers.log.with({
          level: 'info',
          tag: 'FORMS_ADMIN',
          message: 'Forms settings updated',
          action: 'update_forms_settings',
          context: {
            logoEnabled: inputs.settings.logo?.enabled,
            theme: inputs.settings.defaultTheme
          }
        });

        return exits.success(inputs.settings);
      }

    } catch (err) {
      sails.log.error('Error in forms-settings helper:', err);
      return exits.error({ error: err.message });
    }
  }

};
