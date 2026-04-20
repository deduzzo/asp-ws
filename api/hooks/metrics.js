/**
 * metrics hook
 *
 * 1. Registers an Express-level middleware (app.use) to collect HTTP metrics
 *    on EVERY request — runs before Sails routing.
 * 2. Registers GET /metrics with HTTP basic auth.
 * 3. Starts a periodic DB health check for the api_up gauge.
 *
 * Config: sails.config.custom.metrics (from config/custom/private_metrics_config.json)
 */

const MetricsService = require('../services/MetricsService');

module.exports = function defineMetricsHook(sails) {
  return {
    initialize: async function () {
      sails.after('hook:http:loaded', () => {
        const config = sails.config.custom.metrics || {};
        const enabled = config.enabled !== false;
        if (!enabled) {
          sails.log.info('[metrics] Metrics endpoint disabled via config');
          return;
        }

        const metricsUser = config.user || 'metrics';
        const metricsPass = config.pass;
        const app = sails.hooks.http.app;

        // ── HTTP metrics middleware ──
        // Inserted at the FRONT of the Express stack so it fires on every request.
        // Uses res.on('finish') to capture status code and action after routing.
        const httpMetricsMiddleware = function (req, res, next) {
          const start = process.hrtime.bigint();
          MetricsService.httpRequestsInFlight.inc();

          res.on('finish', () => {
            MetricsService.httpRequestsInFlight.dec();

            const method = req.method;
            const status = String(res.statusCode);

            // req.options.action is set by Sails router; missing for non-Sails routes
            let action;
            if (req.options && req.options.action) {
              action = req.options.action;
            } else if (res.statusCode === 404) {
              action = '__not_found';
            } else {
              action = '__unknown';
            }

            const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
            MetricsService.httpRequestsTotal.inc({ method, action, status });
            MetricsService.httpRequestDuration.observe({ method, action }, durationSec);
          });

          next();
        };

        // Insert at position 0 of the Express stack (before all other middleware)
        app._router.stack.splice(0, 0, {
          route: undefined,
          name: 'httpMetricsMiddleware',
          keys: [],
          regexp: { test: () => true, fast_star: true },
          handle: httpMetricsMiddleware,
        });
        sails.log.info('[metrics] HTTP metrics middleware registered (position 0)');

        // ── GET /metrics endpoint ──
        app.get('/metrics', async (req, res) => {
          if (!metricsPass) {
            res.status(503).set('Content-Type', 'text/plain').end('Metrics not configured\n');
            return;
          }

          // Basic auth check
          const authHeader = req.headers.authorization;
          if (!authHeader || !authHeader.startsWith('Basic ')) {
            res.status(401)
              .set('WWW-Authenticate', 'Basic realm="metrics"')
              .set('Content-Type', 'text/plain')
              .end('Unauthorized\n');
            return;
          }

          const decoded = Buffer.from(authHeader.slice(6), 'base64').toString();
          const colonIdx = decoded.indexOf(':');
          if (colonIdx === -1) {
            res.status(401)
              .set('WWW-Authenticate', 'Basic realm="metrics"')
              .set('Content-Type', 'text/plain')
              .end('Unauthorized\n');
            return;
          }

          const user = decoded.slice(0, colonIdx);
          const pass = decoded.slice(colonIdx + 1);

          const crypto = require('crypto');
          const userOk = user.length === metricsUser.length &&
            crypto.timingSafeEqual(Buffer.from(user), Buffer.from(metricsUser));
          const passOk = pass.length === metricsPass.length &&
            crypto.timingSafeEqual(Buffer.from(pass), Buffer.from(metricsPass));

          if (!userOk || !passOk) {
            res.status(401)
              .set('WWW-Authenticate', 'Basic realm="metrics"')
              .set('Content-Type', 'text/plain')
              .end('Unauthorized\n');
            return;
          }

          try {
            const metrics = await MetricsService.registry.metrics();
            res.status(200)
              .set('Content-Type', MetricsService.registry.contentType)
              .end(metrics);
          } catch (err) {
            sails.log.error('[metrics] Error generating metrics:', err);
            res.status(500).set('Content-Type', 'text/plain').end('Error generating metrics\n');
          }
        });

        // Start the DB health check loop
        MetricsService.startHealthCheck();

        sails.log.info('[metrics] GET /metrics endpoint registered');
      });
    }
  };
};
