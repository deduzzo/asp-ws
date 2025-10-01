
module.exports = {
  friendlyName: 'Interfaccia Admin',
  description: 'Display the main admin interface for user and permission management.',

  // Aggiungi questo
  _config: {
    swagger: false
  },


  inputs: {
  },

  exits: {
    success: {
      description: 'The admin interface was displayed successfully.',
      statusCode: 200
    },
  },

  fn: async function (inputs, exits) {
    return exits.success(this.res.view('pages/admin/index', { layout: false }));
  }
};
