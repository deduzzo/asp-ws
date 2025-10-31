/**
 * apps/config.js
 *
 * Get configuration for the current app (including BASE_PATH)
 * This endpoint can be called by containerized apps to get their base path
 */

module.exports = async function (req, res) {
  const appId = req.param('appId');

  try {
    // Get app info
    const app = await AppsService.getAppById(appId);

    if (!app) {
      return res.ApiResponse({
        errType: 'NOT_FOUND',
        errMsg: 'App not found'
      });
    }

    // Return app configuration
    return res.ApiResponse({
      data: {
        appId: app.id,
        basePath: `/apps/${app.id}`,
        name: app.name,
        version: app.version
      }
    });

  } catch (err) {
    sails.log.error('Error in apps/config controller:', err);
    return res.ApiResponse({
      errType: 'SERVER_ERROR',
      errMsg: 'Error getting app configuration: ' + err.message
    });
  }
};
