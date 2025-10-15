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

  exits: {},

  fn: async function (inputs, exits) {

    try {
      // Log the view request
      await sails.helpers.log.with({
        level: 'info',
        tag: 'FORMS',
        action: 'VIEW_INDEX',
        message: 'Forms index page viewed',
        ipAddress: this.req.ip
      });

      // Respond with view (layout: false to disable default layout)
      return this.res.view('pages/forms/index', {}, { layout: false });

    } catch (error) {
      sails.log.error('Error in forms/index:', error);
      return this.res.view('pages/forms/index', {}, { layout: false });
    }

  }

};
