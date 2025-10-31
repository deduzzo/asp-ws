module.exports = {
  friendlyName: 'Get app',
  description: 'Get app details by ID',

  inputs: {
    id: {
      type: 'string',
      required: true,
      description: 'App ID'
    }
  },

  exits: {
    success: {
      description: 'App retrieved successfully',
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

      // Get container status if running
      if (app.containerId) {
        app.containerStatus = await AppsService.getContainerStatus(app.containerId);
      }

      return this.res.ApiResponse({
        data: { app }
      });

    } catch (err) {
      sails.log.error('Error getting app:', err);
      return this.res.ApiResponse({
        errType: 'SERVER_ERROR',
        errMsg: 'Error getting app: ' + err.message
      });
    }
  }
};
