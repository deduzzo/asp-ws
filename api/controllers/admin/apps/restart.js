module.exports = {
  friendlyName: 'Restart app',
  description: 'Restart the Docker container for the app',

  inputs: {
    id: {
      type: 'string',
      required: true,
      description: 'App ID'
    }
  },

  exits: {
    success: {
      description: 'App restarted successfully',
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

      // Stop container if running
      if (app.containerId) {
        try {
          await AppsService.stopContainer(app.containerId);
          await AppsService.removeContainer(app.containerId);
        } catch (err) {
          sails.log.warn('Error stopping/removing container:', err);
        }
      }

      // Start container
      const containerInfo = await AppsService.startContainer(app);

      // Update app configuration
      app.containerId = containerInfo.containerId;
      app.port = containerInfo.port;
      app.status = containerInfo.status;
      await AppsService.saveApp(app);

      return this.res.ApiResponse({
        data: { app }
      });

    } catch (err) {
      sails.log.error('Error restarting app:', err);
      return this.res.ApiResponse({
        errType: 'SERVER_ERROR',
        errMsg: 'Error restarting app: ' + err.message
      });
    }
  }
};
