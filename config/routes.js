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
const moment = require('moment');
const csfr = false;
const JwtService = require('../api/services/JwtService');


const getDocs = async (req, res) => {
  const path = require('path');
  const fs = require('fs');
  const filePath = path.resolve('node_modules/swagger-ui-dist/index.html');
  const apiurl = sails.config.custom.baseUrl + '/swagger.json';
  // csrf
  let csrfToken = '';
  if (req.csrfToken) {
    csrfToken = req.csrfToken();
  }
  try {
    const total_assistiti = await Anagrafica_Assistiti.count();
    // last update è il più alto updatedAt della tabella assistiti
    const lastAssitito = await Anagrafica_Assistiti.find({
      sort: 'updatedAt DESC',
      limit: 1
    });
    const geoCount = await Anagrafica_Assistiti.count({
      lat: {'!=': null},
    });

    const swaggerPath = path.resolve(__dirname, '../swagger/swagger.json');

    if (fs.existsSync(swaggerPath)) {
      let swaggerDoc = fs.readFileSync(swaggerPath, {encoding: 'utf8'});
      swaggerDoc = swaggerDoc.replace('{{TOTAL_ASSISTITI}}', total_assistiti.toLocaleString('it-IT'))
        .replace('{{LAST_UPDATE}}', moment(lastAssitito[0].updatedAt).format('DD/MM/YYYY HH:mm:ss'))
        .replace('{{GEO_PERC}}', ((geoCount / total_assistiti) * 100).toFixed(2) + '%');
      await fs.promises.writeFile(swaggerPath, swaggerDoc, {encoding: 'utf8'});
    }
  } catch (error) {
    sails.log.error('Errore nel bootstrap per il conteggio assistiti:', error);
  }
  fs.readFile(filePath, 'utf8', function (err, data) {
    if (err) {
      return res.serverError(err);
    }
    data = data.replace(' src="./swagger-initializer.js" charset="UTF-8"> ',
      '> let csrfToken= "' + csrfToken + '"; window.onload = function() {' +
      'window.ui = SwaggerUIBundle({' +
      '  url: "' + apiurl + '",' +
      '  dom_id: "#swagger-ui",' +
      '  deepLinking: true,' +
      '  presets: [' +
      '    SwaggerUIBundle.presets.apis,' +
      '    SwaggerUIStandalonePreset' +
      '  ],' +
      '  plugins: [' +
      '    SwaggerUIBundle.plugins.DownloadUrl' +
      '  ],' +
      '  layout: "StandaloneLayout"' + (csrfToken !== '' ?
        '  ,requestInterceptor: function(req) {' +
        '    req.headers["X-CSRF-Token"] = csrfToken;' +
        '    return req;' +
        '  }' : '') +
      '});' +
      '};');

    res.send(data);
  });
};

let routes = {

  /***************************************************************************
   *                                                                          *
   * Make the view located at `views/homepage.ejs` your home page.            *
   *                                                                          *
   * (Alternatively, remove this and add an `index.html` file in your         *
   * `assets` directory)                                                      *
   *                                                                          *
   ***************************************************************************/

  '/': getDocs,

  'POST /api/v1/login/get-token': {
    action: 'login/get-token',
  },
  'POST /api/v1/anagrafica/ricerca': {
    action: 'anagrafica/ricerca',
    scopi: ['asp5-anagrafica'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.user
  },
  'POST /api/v1/anagrafica/nuovi-assistiti': {
    action: 'anagrafica/nuovi-assistiti',
    scopi: ['asp5-anagrafica'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },


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

  'GET /docs': getDocs,
};

// Aggiungi la rotta CSRF solo se è abilitato
if (csfr) {
  routes['GET /csrfToken'] = {action: 'security/grant-csrf-token'};
}

module.exports.routes = routes;
