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

      // Get status for each running app
      for (const app of apps) {
        if (app.containerId) {
          const status = await AppsService.getContainerStatus(app.containerId);
          app.containerStatus = status;
        }
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
