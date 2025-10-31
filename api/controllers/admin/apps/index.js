module.exports = {
  friendlyName: 'Apps Admin Interface',
  description: 'Display the admin interface for Docker apps management.',

  _config: {
    swagger: false
  },

  inputs: {
  },

  exits: {
    success: {
      description: 'The apps admin interface was displayed successfully.',
      statusCode: 200
    },
  },

  fn: async function (inputs, exits) {
    return exits.success(this.res.view('pages/admin/apps/index', { layout: false }));
  }
};
