module.exports = {
  friendlyName: 'Get app logs',
  description: 'Get logs from the Docker container',

  inputs: {
    id: {
      type: 'string',
      required: true,
      description: 'App ID'
    },
    tail: {
      type: 'number',
      required: false,
      defaultsTo: 100,
      description: 'Number of lines to tail'
    }
  },

  exits: {
    success: {
      description: 'Logs retrieved successfully',
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

      // Get logs by container name (more reliable than stale containerId)
      const containerName = `asp-app-${inputs.id}`;
      const logs = await AppsService.getContainerLogs(containerName, inputs.tail);

      return this.res.ApiResponse({
        data: { logs }
      });

    } catch (err) {
      sails.log.error('Error getting app logs:', err);
      return this.res.ApiResponse({
        errType: 'SERVER_ERROR',
        errMsg: 'Error getting app logs: ' + err.message
      });
    }
  }
};
