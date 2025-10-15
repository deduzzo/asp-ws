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

      // Read the view file directly and render it
      const ejs = require('ejs');
      const path = require('path');
      const fs = require('fs');
      const viewPath = path.join(sails.config.appPath, 'views', 'pages', 'forms', 'index.ejs');
      const template = fs.readFileSync(viewPath, 'utf8');
      const html = ejs.render(template, {});

      return this.res.send(html);

    } catch (error) {
      sails.log.error('Error in forms/index:', error);
      const ejs = require('ejs');
      const path = require('path');
      const fs = require('fs');
      const viewPath = path.join(sails.config.appPath, 'views', 'pages', 'forms', 'index.ejs');
      const template = fs.readFileSync(viewPath, 'utf8');
      const html = ejs.render(template, {});
      return this.res.send(html);
    }

  }

};
