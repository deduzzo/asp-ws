/**
 * metrics hook
 *
 * Registers GET /metrics with HTTP basic auth.
 * Metrics are derived from the Log database table (not in-memory counters).
 * On each scrape, MetricsService queries the DB with a 15s cache.
 *
 * Config: sails.config.custom.metrics (from config/custom/private_metrics_config.json)
 */

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

          // Refresh metrics from DB (cached 15s) and serve
          try {
            const MetricsService = require('../services/MetricsService');
            await MetricsService.refreshMetricsFromDb();
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
        const MetricsService = require('../services/MetricsService');
        MetricsService.startHealthCheck();

        sails.log.info('[metrics] GET /metrics endpoint registered (Log-based)');
      });
    }
  };
};
