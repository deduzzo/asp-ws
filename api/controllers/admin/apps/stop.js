module.exports = {
  friendlyName: 'Stop app',
  description: 'Stop the Docker container for the app',

  inputs: {
    id: {
      type: 'string',
      required: true,
      description: 'App ID'
    }
  },

  exits: {
    success: {
      description: 'App stopped successfully',
    },
    notFound: {
      description: 'App not found',
      statusCode: 404
    }
  },

  fn: async function (inputs, exits) {
    try {
      const app = await AppsService.getAppById(inputs.id);

      if (!app) {
        return this.res.ApiResponse({
          errType: 'NOT_FOUND',
          errMsg: 'App not found'
        });
      }

      if (!app.containerId) {
        return this.res.ApiResponse({
          errType: 'BAD_REQUEST',
          errMsg: 'App is not running'
        });
      }

      // Stop container
      await AppsService.stopContainer(app.containerId);

      // Update app configuration
      app.status = 'stopped';
      await AppsService.saveApp(app);

      // Invalidate proxy cache for stopped app
      sails.hooks['apps-proxy'].invalidateProxy(inputs.id);

      return this.res.ApiResponse({
        data: { app }
      });

    } catch (err) {
      sails.log.error('Error stopping app:', err);
      return this.res.ApiResponse({
        errType: 'SERVER_ERROR',
        errMsg: 'Error stopping app: ' + err.message
      });
    }
  }
};
