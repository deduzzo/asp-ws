module.exports = {
  friendlyName: 'List apps',
  description: 'Get list of all Docker apps',

  inputs: {
  },

  exits: {
    success: {
      description: 'Apps retrieved successfully',
    },
  },

  fn: async function (inputs, exits) {
    try {
      const apps = await AppsService.getAllApps();

      // Get status for each app by container name (more reliable than containerId)
      for (const app of apps) {
        const containerName = `asp-app-${app.id}`;
        const status = await AppsService.getContainerStatus(containerName);
        app.containerStatus = status;
      }

      return this.res.ApiResponse({
        data: { apps }
      });

    } catch (err) {
      sails.log.error('Error listing apps:', err);
      return this.res.ApiResponse({
        errType: 'SERVER_ERROR',
        errMsg: 'Error listing apps: ' + err.message
      });
    }
  }
};
