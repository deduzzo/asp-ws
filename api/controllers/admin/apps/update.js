module.exports = {
  friendlyName: 'Update app from GitHub',
  description: 'Pull latest changes from GitHub for an app',

  inputs: {
    id: {
      type: 'string',
      required: true,
      description: 'App ID'
    }
  },

  exits: {
    success: {
      description: 'App updated successfully',
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

      if (app.source !== 'github') {
        return this.res.ApiResponse({
          errType: 'BAD_REQUEST',
          errMsg: 'App is not from GitHub'
        });
      }

      // Pull latest changes
      await AppsService.updateFromGithub(inputs.id);

      // Update timestamp
      app.updatedAt = new Date().toISOString();
      await AppsService.saveApp(app);

      return this.res.ApiResponse({
        data: { app }
      });

    } catch (err) {
      sails.log.error('Error updating app:', err);
      return this.res.ApiResponse({
        errType: 'SERVER_ERROR',
        errMsg: 'Error updating app: ' + err.message
      });
    }
  }
};
