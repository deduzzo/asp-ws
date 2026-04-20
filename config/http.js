/**
 * HTTP Server Settings
 * (sails.config.http)
 *
 * Configuration for the underlying HTTP server in Sails.
 * (for additional recommended settings, see `config/env/production.js`)
 *
 * For more information on configuration, check out:
 * https://sailsjs.com/config/http
 */

module.exports.http = {

  /****************************************************************************
  *                                                                           *
  * Sails/Express middleware to run for every HTTP request.                   *
  * (Only applies to HTTP requests -- not virtual WebSocket requests.)        *
  *                                                                           *
  * https://sailsjs.com/documentation/concepts/middleware                     *
  *                                                                           *
  ****************************************************************************/

  middleware: {

    /***************************************************************************
    *                                                                          *
    * The order in which middleware should be run for HTTP requests.           *
    * (This Sails app's routes are handled by the "router" middleware below.)  *
    *                                                                          *
    ***************************************************************************/
    swaggerUi: require('express').static('node_modules/swagger-ui-dist'),
    prometheusMiddleware: (function () {
      const MetricsService = require('../api/services/MetricsService');
      return function prometheusMiddleware(req, res, next) {
        const start = process.hrtime.bigint();
        MetricsService.httpRequestsInFlight.inc();

        res.on('finish', () => {
          MetricsService.httpRequestsInFlight.dec();
          const action = (req.options && req.options.action) || 'unknown';
          const method = req.method;
          const status = String(res.statusCode);
          const durationSec = Number(process.hrtime.bigint() - start) / 1e9;

          MetricsService.httpRequestsTotal.inc({ method, action, status });
          MetricsService.httpRequestDuration.observe({ method, action }, durationSec);
        });

        next();
      };
    })(),

    order: [
      'cookieParser',
      'session',
      'bodyParser',
      'compress',
      'poweredBy',
      'prometheusMiddleware',
      'router',
      'www',
      'favicon',
      'swaggerUi',
    ],


    /***************************************************************************
    *                                                                          *
    * The body parser that will handle incoming multipart HTTP requests.       *
    *                                                                          *
    * https://sailsjs.com/config/http#?customizing-the-body-parser             *
    *                                                                          *
    ***************************************************************************/

    // bodyParser: (function _configureBodyParser(){
    //   var skipper = require('skipper');
    //   var middlewareFn = skipper({ strict: true });
    //   return middlewareFn;
    // })(),

  },

};
