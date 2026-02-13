module.exports = {
  friendlyName: 'Delete app',
  description: 'Delete an app and its Docker container',

  inputs: {
    id: {
      type: 'string',
      required: true,
      description: 'App ID'
    }
  },

  exits: {
    success: {
      description: 'App deleted successfully',
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

      // Remove container if exists
      if (app.containerId) {
        try {
          await AppsService.removeContainer(app.containerId);
        } catch (err) {
          sails.log.warn('Error removing container:', err);
        }
      }

      // Invalidate proxy cache before deletion
      sails.hooks['apps-proxy'].invalidateProxy(inputs.id);

      // Delete app
      await AppsService.deleteApp(inputs.id);

      return this.res.ApiResponse({
        data: { success: true }
      });

    } catch (err) {
      sails.log.error('Error deleting app:', err);
      return this.res.ApiResponse({
        errType: 'SERVER_ERROR',
        errMsg: 'Error deleting app: ' + err.message
      });
    }
  }
};
