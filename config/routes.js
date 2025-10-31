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
  return res.view('pages/homepage', { layout: false });
};

// Basic auth middleware using config/custom/private_ui_users.json
const getBasicAuthMiddleware = () => {
  let authConfig;
  try {
    authConfig = require('./custom/private_ui_users.json');
  } catch (error) {
    console.warn('Warning: private_ui_users.json not found, using default credentials');
    authConfig = {
      users: [{ username: 'admin', password: 'password123' }],
      challenge: true,
      realm: 'ASP5Ws Admin Portal'
    };
  }

  // Convert users array to object format expected by express-basic-auth
  const usersObj = {};
  if (authConfig.users && Array.isArray(authConfig.users)) {
    authConfig.users.forEach(user => {
      usersObj[user.username] = user.password;
    });
  }

  return basicAuth({
    users: usersObj,
    challenge: authConfig.challenge !== false,
    realm: authConfig.realm || 'ASP5Ws Admin Portal'
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

  fs.readFile(filePath, 'utf8', function (err, data) {
    if (err) {
      return res.serverError(err);
    }
    data = data.replace(' src="./swagger-initializer.js" charset="UTF-8"> ',
      '> let csrfToken= "' + csrfToken + '"; window.onload = function() {' +
      '  var headers = {};' +
      '  if (csrfToken) { headers["X-CSRF-Token"] = csrfToken; }' +
      '  var swaggerPromise = fetch("' + apiurl + '", { credentials: "same-origin" }).then(function(r){ return r.text(); });' +
      '  var statsPromise = fetch("/api/v1/stats/info", { method: "GET", headers: headers, credentials: "same-origin" })' +
      '    .then(function(r){ return r.json(); })' +
      '    .then(function(j){ return (j && j.data) ? j.data : j; });' +
      '  Promise.all([swaggerPromise, statsPromise]).then(function(arr){' +
      '    var specText = arr[0]; var stats = arr[1] || {};' +
      '    try {' +
      '      if (specText) {' +
      '        specText = specText.replace(/{{TOTAL_ASSISTITI}}/g, stats.totAssistiti || "");' +
      '        specText = specText.replace(/{{LAST_UPDATE}}/g, stats.lastUpdate || "");' +
      '        specText = specText.replace(/{{GEO_PERC}}/g, stats.geoPerc || "");' +
      '      }' +
      '      var specObj = JSON.parse(specText);' +
      '      window.ui = SwaggerUIBundle({' +
      '        spec: specObj,' +
      '        dom_id: "#swagger-ui",' +
      '        deepLinking: true,' +
      '        presets: [' +
      '          SwaggerUIBundle.presets.apis,' +
      '          SwaggerUIStandalonePreset' +
      '        ],' +
      '        plugins: [' +
      '          SwaggerUIBundle.plugins.DownloadUrl' +
      '        ],' +
      '        layout: "StandaloneLayout"' + (csrfToken !== '' ?
      '        ,requestInterceptor: function(req) {' +
      '          req.headers["X-CSRF-Token"] = csrfToken;' +
      '          return req;' +
      '        }' : '') +
      '      });' +
      '    } catch(e) { console.error("Errore inizializzando SwaggerUI con spec:", e); }' +
      '  }).catch(function(err){ console.error("Errore caricando swagger.json o stats:", err); });' +
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
  'POST /api/v1/login/verify-token': {
    action: 'login/verify-token',
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
  'POST /api/v1/cambio-medico/get-medici': {
    action: 'cambio-medico/get-medici',
    scopi: ['cambio-medico'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.user
  },
  'POST /api/v1/cambio-medico/get-medici-disponibili-assistito': {
    action: 'cambio-medico/get-medici-disponibili-assistito',
    scopi: ['cambio-medico'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.user
  },
  'POST /api/v1/cambio-medico/get-situazioni-assistenziali-assistito': {
    action: 'cambio-medico/get-situazioni-assistenziali-assistito',
    scopi: ['cambio-medico'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.user
  },
  'POST /api/v1/cambio-medico/get-ambito-domicilio-assistito': {
    action: 'cambio-medico/get-ambito-domicilio-assistito',
    scopi: ['cambio-medico'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.user
  },
  'POST /api/v1/cambio-medico/get-situazione-medico': {
    action: 'cambio-medico/get-situazione-medico',
    scopi: ['cambio-medico'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.user
  },

  'GET /api/v1/stats/info': {
    action: 'stats/info',
  },

  // Dynamic Forms routes (public)
  'GET /forms': {
    action: 'forms/index',
  },
  'GET /forms/:id': {
    action: 'forms/view-form',
  },
  'GET /api/v1/forms': {
    action: 'forms/list-forms',
  },
  'GET /api/v1/forms/:id': {
    action: 'forms/get-form',
  },
  'POST /api/v1/forms/:id/submit': {
    action: 'forms/submit-form',
  },

  // Dynamic Forms admin routes (protected)
  'GET /api/v1/forms/:id/submissions': {
    action: 'forms/get-submissions',
    scopi: ['forms'],
    ambito: 'login',
    minAuthLevel: JwtService.LOGIN_LEVEL.user
  },
  'GET /api/v1/forms/:id/submissions/export': {
    action: 'forms/export-submissions',
    scopi: ['forms'],
    ambito: 'login',
    minAuthLevel: JwtService.LOGIN_LEVEL.user
  },
  'DELETE /api/v1/forms/:id/submissions/:submissionId': {
    action: 'forms/delete-submission',
    scopi: ['forms'],
    ambito: 'login',
    minAuthLevel: JwtService.LOGIN_LEVEL.user
  },
  'POST /api/v1/forms/import': {
    action: 'forms/import-form',
    scopi: ['forms'],
    ambito: 'login',
    minAuthLevel: JwtService.LOGIN_LEVEL.admin
  },
  'DELETE /api/v1/forms/:formId': {
    action: 'forms/delete-form',
    scopi: ['forms'],
    ambito: 'login',
    minAuthLevel: JwtService.LOGIN_LEVEL.admin
  },
  'PUT /api/v1/forms/:formId/settings': {
    action: 'forms/update-form-settings',
    scopi: ['forms'],
    ambito: 'login',
    minAuthLevel: JwtService.LOGIN_LEVEL.admin
  },
  'GET /api/v1/forms/global/settings': {
    action: 'forms/get-global-settings',
    scopi: ['forms'],
    ambito: 'login',
    minAuthLevel: JwtService.LOGIN_LEVEL.admin
  },
  'PUT /api/v1/forms/global/settings': {
    action: 'forms/update-global-settings',
    scopi: ['forms'],
    ambito: 'login',
    minAuthLevel: JwtService.LOGIN_LEVEL.admin
  },
  'POST /api/v1/forms/global/logo': {
    action: 'forms/upload-logo',
    scopi: ['forms'],
    ambito: 'login',
    minAuthLevel: JwtService.LOGIN_LEVEL.admin
  },

  // Forms admin interface
  'GET /admin/forms': {
    action: 'forms/admin-index'
  },
  'GET /admin/forms/new': {
    action: 'forms/create-form'
  },
  'GET /admin/forms/:id/edit': {
    action: 'forms/edit-form'
  },
  'GET /admin/forms/:id': {
    action: 'forms/admin-view'
  },
  'PUT /api/v1/forms/:formId/update': {
    action: 'forms/update-form-definition',
    scopi: ['forms'],
    ambito: 'login',
    minAuthLevel: JwtService.LOGIN_LEVEL.admin
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

  // Admin interface routes
  'GET /admin': {
    fn: function(req, res, next) {
      // Apply the middleware directly
      const authMiddleware = getBasicAuthMiddleware();
      authMiddleware(req, res, function(err) {
        if (err) {
          return res.status(401).send('Unauthorized');
        }
        // If authentication passes, call the admin/index action
        return res.redirect('/admin/index');
      });
    }
  },
  'GET /admin/index': {
    fn: function(req, res, next) {
      // Apply the middleware directly
      const authMiddleware = getBasicAuthMiddleware();
      authMiddleware(req, res, function(err) {
        if (err) {
          return res.status(401).send('Unauthorized');
        }
        // If authentication passes, serve the admin view directly
        return res.view('pages/admin/index', { layout: false });
      });
    }
  },

  // Admin API routes for users
  'GET /api/v1/admin/users': {
    action: 'admin/users/list',
    scopi: ['admin-manage'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'POST /api/v1/admin/users': {
    action: 'admin/users/create',
    scopi: ['admin-manage'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'PUT /api/v1/admin/users/:id': {
    action: 'admin/users/update',
    scopi: ['admin-manage'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'DELETE /api/v1/admin/users/:id': {
    action: 'admin/users/delete',
    scopi: ['admin-manage'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },

  // Admin API routes for scopes
  'GET /api/v1/admin/scopes': {
    action: 'admin/scopes/list',
    scopi: ['admin-manage'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'POST /api/v1/admin/scopes': {
    action: 'admin/scopes/create',
    scopi: ['admin-manage'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'PUT /api/v1/admin/scopes/:id': {
    action: 'admin/scopes/update',
    scopi: ['admin-manage'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'DELETE /api/v1/admin/scopes/:id': {
    action: 'admin/scopes/delete',
    scopi: ['admin-manage'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },

  // Admin API routes for domains
  'GET /api/v1/admin/domains': {
    action: 'admin/domains/list',
    scopi: ['admin-manage'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'POST /api/v1/admin/domains': {
    action: 'admin/domains/create',
    scopi: ['admin-manage'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'PUT /api/v1/admin/domains/:id': {
    action: 'admin/domains/update',
    scopi: ['admin-manage'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'DELETE /api/v1/admin/domains/:id': {
    action: 'admin/domains/delete',
    scopi: ['admin-manage'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },

  // Admin API routes for levels
  'GET /api/v1/admin/levels': {
    action: 'admin/levels/list',
    scopi: ['admin-manage'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },

  // Admin interface for Docker apps
  'GET /admin/apps': {
    fn: function(req, res, next) {
      // Apply the middleware directly
      const authMiddleware = getBasicAuthMiddleware();
      authMiddleware(req, res, function(err) {
        if (err) {
          return res.status(401).send('Unauthorized');
        }
        // If authentication passes, serve the apps admin view
        return res.view('pages/admin/apps/index', { layout: false });
      });
    }
  },

  // Admin API routes for Docker apps
  'GET /api/v1/admin/apps/list': {
    action: 'admin/apps/list',
    scopi: ['apps'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'GET /api/v1/admin/apps/get': {
    action: 'admin/apps/get',
    scopi: ['apps'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'POST /api/v1/admin/apps/upload': {
    action: 'admin/apps/upload',
    scopi: ['apps'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'POST /api/v1/admin/apps/clone': {
    action: 'admin/apps/clone',
    scopi: ['apps'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'POST /api/v1/admin/apps/update': {
    action: 'admin/apps/update',
    scopi: ['apps'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'POST /api/v1/admin/apps/start': {
    action: 'admin/apps/start',
    scopi: ['apps'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'POST /api/v1/admin/apps/stop': {
    action: 'admin/apps/stop',
    scopi: ['apps'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'POST /api/v1/admin/apps/restart': {
    action: 'admin/apps/restart',
    scopi: ['apps'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'POST /api/v1/admin/apps/delete': {
    action: 'admin/apps/delete',
    scopi: ['apps'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'GET /api/v1/admin/apps/logs': {
    action: 'admin/apps/logs',
    scopi: ['apps'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },
  'POST /api/v1/admin/apps/docker-settings': {
    action: 'admin/apps/docker-settings',
    scopi: ['apps'],
    ambito: 'api',
    minAuthLevel: JwtService.LOGIN_LEVEL.superAdmin
  },

  // Proxy routes for running apps (must be last to not interfere with other routes)
  'GET /apps/:appId': { action: 'apps/proxy', skipAssets: true },
  'GET /apps/:appId/*': { action: 'apps/proxy', skipAssets: true },
  'POST /apps/:appId/*': { action: 'apps/proxy', skipAssets: true },
  'PUT /apps/:appId/*': { action: 'apps/proxy', skipAssets: true },
  'DELETE /apps/:appId/*': { action: 'apps/proxy', skipAssets: true },
  'PATCH /apps/:appId/*': { action: 'apps/proxy', skipAssets: true },
};

// Aggiungi la rotta CSRF solo se è abilitato
if (csfr) {
  routes['GET /csrfToken'] = {action: 'security/grant-csrf-token'};
}

module.exports.routes = routes;
