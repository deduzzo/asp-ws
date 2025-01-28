/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes tell Sails what to do each time it receives a request.
 *
 * For more information on configuring custom routes, check out:
 * https://sailsjs.com/anatomy/config/routes-js
 */

const path = require('path');
const fs = require('fs');
module.exports.routes = {

  /***************************************************************************
  *                                                                          *
  * Make the view located at `views/homepage.ejs` your home page.            *
  *                                                                          *
  * (Alternatively, remove this and add an `index.html` file in your         *
  * `assets` directory)                                                      *
  *                                                                          *
  ***************************************************************************/

  '/': { view: 'pages/homepage' },

  'GET /csrfToken':                          { action: 'security/grant-csrf-token' },
  'POST /api/v1/login/get-token':            { action: 'login/get-token' },
  'POST /api/v1/anagrafica/assistito':       { action: 'anagrafica/assistito' },
  'POST /api/v1/anagrafica/nuovo-assistito': { action: 'anagrafica/nuovo-assistito' },



  /***************************************************************************
  *                                                                          *
  * More custom routes here...                                               *
  * (See https://sailsjs.com/config/routes for examples.)                    *
  *                                                                          *
  * If a request to a URL doesn't match any of the routes in this file, it   *
  * is matched against "shadow routes" (e.g. blueprint routes).  If it does  *
  * not match any of those, it is matched against static assets.             *
  *                                                                          *
  ***************************************************************************/



  'get /swagger.json': (_, res) => {
    const swaggerJson = require('../swagger/swagger.json');
    if (!swaggerJson) {
      res
        .status(404)
        .set('content-type', 'application/json')
        .send({message: 'Cannot find swagger.json, has the server generated it?'});
    }
    return res
      .status(200)
      .set('content-type', 'application/json')
      .send(swaggerJson);
  },

  'GET /docs': function(req, res) {
    var path = require('path');
    var fs = require('fs');
    var filePath = path.resolve('node_modules/swagger-ui-dist/index.html');
    var apiurl = sails.config.custom.baseUrl + '/swagger.json';
    // csrf
    var csrfToken = '';
    if (req.csrfToken) {
      csrfToken = req.csrfToken();
    }
    fs.readFile(filePath, 'utf8', function(err, data) {
      if (err) {
        return res.serverError(err);
      }
      data = data.replace(' src="./swagger-initializer.js" charset="UTF-8"> ',
        '> let csrfToken= "'+csrfToken +'"; window.onload = function() {' +
        'window.ui = SwaggerUIBundle({' +
        '  url: "'+ apiurl +'",' +
        '  dom_id: "#swagger-ui",' +
        '  deepLinking: true,' +
        '  presets: [' +
        '    SwaggerUIBundle.presets.apis,' +
        '    SwaggerUIStandalonePreset' +
        '  ],' +
        '  plugins: [' +
        '    SwaggerUIBundle.plugins.DownloadUrl' +
        '  ],' +
        '  layout: "StandaloneLayout",' +
        '  requestInterceptor: function(req) {' +
        '    req.headers["X-CSRF-Token"] = csrfToken;' +
        '    return req;' +
        '  }' +
        '});' +
        '};');

      res.send(data);
    });
  }


};
