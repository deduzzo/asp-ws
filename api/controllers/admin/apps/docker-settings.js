/**
 * admin/apps/docker-settings.js
 *
 * Save Docker execution settings (normal or with sudo)
 */

const fs = require('fs-extra');
const path = require('path');

const DOCKER_SETTINGS_PATH = path.join(sails.config.appPath, 'config', 'custom', 'docker_settings.json');

module.exports = async function (req, res) {
  const { useSudo, sudoPassword } = req.body;

  try {
    // Validate inputs
    if (typeof useSudo !== 'boolean') {
      return res.ApiResponse({
        errType: 'BAD_REQUEST',
        errMsg: 'useSudo deve essere un valore booleano'
      });
    }

    if (useSudo && !sudoPassword) {
      return res.ApiResponse({
        errType: 'BAD_REQUEST',
        errMsg: 'Password richiesta quando si usa sudo'
      });
    }

    const settings = {
      useSudo: useSudo,
      sudoPassword: useSudo ? sudoPassword : null,
      updatedAt: new Date().toISOString()
    };

    // Save settings to file
    await fs.writeJson(DOCKER_SETTINGS_PATH, settings, { spaces: 2 });

    return res.ApiResponse({
      data: {
        message: 'Impostazioni Docker salvate con successo',
        useSudo: settings.useSudo
      }
    });

  } catch (err) {
    sails.log.error('Error saving Docker settings:', err);
    return res.ApiResponse({
      errType: 'SERVER_ERROR',
      errMsg: 'Errore nel salvare le impostazioni Docker: ' + err.message
    });
  }
};
