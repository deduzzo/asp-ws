module.exports = {
  friendlyName: 'Start app',
  description: 'Start a Docker container for the app',

  inputs: {
    id: {
      type: 'string',
      required: true,
      description: 'App ID'
    }
  },

  exits: {
    success: {
      description: 'App started successfully',
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

      // Check by container name (more reliable than stale containerId)
      const containerName = `asp-app-${inputs.id}`;
      const status = await AppsService.getContainerStatus(containerName);
      if (status.running) {
        return this.res.ApiResponse({
          errType: 'BAD_REQUEST',
          errMsg: 'App is already running'
        });
      }
      // Remove old container if exists
      try { await AppsService.removeContainer(containerName); } catch (err) { /* ignore */ }

      // Start container
      const containerInfo = await AppsService.startContainer(app);

      // Update app configuration
      app.containerId = containerInfo.containerId;
      app.port = containerInfo.port;
      app.status = containerInfo.status;
      await AppsService.saveApp(app);

      // Invalidate proxy cache so a new proxy is created with the new port
      sails.hooks['apps-proxy'].invalidateProxy(inputs.id);

      return this.res.ApiResponse({
        data: { app }
      });

    } catch (err) {
      sails.log.error('Error starting app:', err);
      return this.res.ApiResponse({
        errType: 'SERVER_ERROR',
        errMsg: 'Error starting app: ' + err.message
      });
    }
  }
};
