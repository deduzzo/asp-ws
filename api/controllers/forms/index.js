/**
 * forms/index.js
 *
 * @description :: Display the forms index page
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {

  friendlyName: 'Forms index',

  description: 'Display the forms index page with list of all available forms',

  inputs: {},

  exits: {
    success: {
      viewTemplatePath: 'pages/forms/index'
    }
  },

  fn: async function (inputs, exits) {

    try {
      // Log the view request
      await sails.helpers.log.with({
        level: 'info',
        tag: 'FORMS',
        action: 'VIEW_INDEX',
        msg: 'Forms index page viewed',
        ip: this.req.ip
      });

      // Respond with view
      return exits.success();

    } catch (error) {
      sails.log.error('Error in forms/index:', error);
      return exits.success();
    }

  }

};
