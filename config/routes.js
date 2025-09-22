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
const basicAuth = require('express-basic-auth');
const indexConfig = require('./custom/private_index.json');

// Function to render the homepage
const getHomepage = (req, res) => {
  return res.view('pages/homepage');
};

// Basic auth middleware using config/auth.js
const getBasicAuthMiddleware = () => {
  const authConfig = require('./auth').auth || { users: { 'admin': 'password123' }, challenge: true, realm: 'ASP5Ws Documentation' };
  return basicAuth({
    users: authConfig.users,
    challenge: authConfig.challenge,
    realm: authConfig.realm
  });
};

const getDocs = async (req, res) => {
  const path = require('path');
  const fs = require('fs');
  const filePath = path.resolve('node_modules/swagger-ui-dist/index.html');
  // Construct the base URL from the request
  const baseUrl = indexConfig.BASEURL;
  const apiurl = baseUrl + '/swagger.json';
  // csrf
  let csrfToken = '';
  if (req.csrfToken) {
    csrfToken = req.csrfToken();
  }
/*  try {
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
  }*/
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
/*      '(function(){' +
      '  function doReplaceTokens(stats){' +
      '    try {' +
      '      var el = document.getElementById("swagger-ui");' +
      '      if(!el) return;' +
      '      var html = el.innerHTML;' +
      '      html = html.replace(/{{TOTAL_ASSISTITI}}/g, (stats && stats.totAssistiti) ? stats.totAssistiti : "");' +
      '      html = html.replace(/{{LAST_UPDATE}}/g, (stats && stats.lastUpdate) ? stats.lastUpdate : "");' +
      '      html = html.replace(/{{GEO_PERC}}/g, (stats && stats.geoPerc) ? stats.geoPerc : "");' +
      '      el.innerHTML = html;' +
      '    } catch(e) { console.error("Errore nella sostituzione dei token SwaggerUI:", e); }' +
      '  }' +
      '  function fetchStatsAndReplace(){' +
      '    var headers = {};' +
      '    if (csrfToken) { headers["X-CSRF-Token"] = csrfToken; }' +
      '    fetch("/api/v1/stats/info", { method: "GET", headers: headers, credentials: "same-origin" })' +
      '      .then(function(r){ return r.json(); })' +
      '      .then(function(j){ var data = (j && j.data) ? j.data : j; doReplaceTokens(data); })' +
      '      .catch(function(err){ console.error("Errore caricando /api/v1/stats/info:", err); });' +
      '  }' +
      '  /!* Attendi che SwaggerUI abbia renderizzato il contenuto e poi esegui la sostituzione *!/' +
      '  var attempts = 0;' +
      '  var iv = setInterval(function(){' +
      '    attempts++;' +
      '    var el = document.getElementById("swagger-ui");' +
      '    if (el && /{{(TOTAL_ASSISTITI|LAST_UPDATE|GEO_PERC)}}/.test(el.innerHTML)) {' +
      '      clearInterval(iv);' +
      '      fetchStatsAndReplace();' +
      '    }' +
      '    if (attempts > 50) { clearInterval(iv); }' +
      '  }, 200);' +
      '})();' +*/
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

  '/': getHomepage,

  'POST /api/v1/login/get-token': {
    action: 'login/get-token',
  },
  'POST /api/v1/anagrafica/ricerca': {
    action: 'anagrafica/ricerca',
    scopi: ['asp5-anagrafica'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.user
  },
  'POST /api/v1/anagrafica/ricerca-massiva': {
    action: 'anagrafica/ricerca-massiva',
    scopi: ['asp5-anagrafica'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'POST /api/v1/anagrafica/nuovi-assistiti': {
    action: 'anagrafica/nuovi-assistiti',
    scopi: ['asp5-anagrafica'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'GET /api/v1/anagrafica/get-geo-data': {
    action: 'anagrafica/get-geo-data',
    scopi: ['asp5-anagrafica'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'GET /api/v1/anagrafica/get-geo-data-job': {
    action: 'anagrafica/get-geo-data-job',
    scopi: ['asp5-anagrafica'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'GET /api/v1/anagrafica/get-geo-data-job-status': {
    action: 'anagrafica/get-geo-data-job-status',
    scopi: ['asp5-anagrafica'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'POST /api/v1/anagrafica/get-geo-data-stats': {
    action: 'anagrafica/get-geo-data-stats',
    scopi: ['asp5-anagrafica'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'POST /api/v1/admin/new-user': {
    action: 'admin/new-user',
    scopi: ['admin-manage'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },

  'GET /api/v1/stats/info': {
    action: 'stats/info',
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



  'GET /swagger.json': {
    fn: function(req, res, next) {
      // Apply the middleware directly
      const authMiddleware = getBasicAuthMiddleware();
      authMiddleware(req, res, function(err) {
        if (err) {
          return res.status(401).send('Unauthorized');
        }
        // If authentication passes, serve the swagger.json file
        const fs = require('fs');
        const path = require('path');
        const swaggerPath = path.resolve(__dirname, '../swagger/swagger.json');

        if (!fs.existsSync(swaggerPath)) {
          return res
            .status(404)
            .set('content-type', 'application/json')
            .send({message: 'Cannot find swagger.json, has the server generated it?'});
        }

        try {
          const swaggerJson = JSON.parse(fs.readFileSync(swaggerPath, {encoding: 'utf8'}));
          return res
            .status(200)
            .set('content-type', 'application/json')
            .send(swaggerJson);
        } catch (error) {
          return res
            .status(500)
            .set('content-type', 'application/json')
            .send({message: 'Error reading swagger.json', error: error.message});
        }
      });
    }
  },

  'GET /docs': {
    fn: function(req, res, next) {
      // Apply the middleware directly
      const authMiddleware = getBasicAuthMiddleware();
      authMiddleware(req, res, function(err) {
        if (err) {
          return res.status(401).send('Unauthorized');
        }
        // If authentication passes, call the getDocs function
        getDocs(req, res);
      });
    }
  },
};

// Aggiungi la rotta CSRF solo se è abilitato
if (csfr) {
  routes['GET /csrfToken'] = {action: 'security/grant-csrf-token'};
}

module.exports.routes = routes;
