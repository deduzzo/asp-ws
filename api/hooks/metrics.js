/**
 * metrics hook
 *
 * Registers GET /metrics on the underlying Express app with HTTP basic auth.
 * Completely bypasses Sails routing and policies.
 *
 * Env vars:
 *   METRICS_ENABLED  — "true" (default) or "false"
 *   METRICS_USER     — basic auth username (default: "metrics")
 *   METRICS_PASS     — basic auth password (required, no default)
 */

module.exports = function defineMetricsHook(sails) {
  return {
    initialize: async function () {
      sails.after('hook:http:loaded', () => {
        const enabled = (process.env.METRICS_ENABLED || 'true') === 'true';
        if (!enabled) {
          sails.log.info('[metrics] Metrics endpoint disabled via METRICS_ENABLED=false');
          return;
        }

        const metricsUser = process.env.METRICS_USER || 'metrics';
        const metricsPass = process.env.METRICS_PASS;

        const app = sails.hooks.http.app;

        app.get('/metrics', async (req, res) => {
          // If METRICS_PASS is not configured, return 503
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

          // Constant-time comparison to prevent timing attacks
          const userOk = user.length === metricsUser.length &&
            require('crypto').timingSafeEqual(Buffer.from(user), Buffer.from(metricsUser));
          const passOk = pass.length === metricsPass.length &&
            require('crypto').timingSafeEqual(Buffer.from(pass), Buffer.from(metricsPass));

          if (!userOk || !passOk) {
            res.status(401)
              .set('WWW-Authenticate', 'Basic realm="metrics"')
              .set('Content-Type', 'text/plain')
              .end('Unauthorized\n');
            return;
          }

          // Serve metrics
          try {
            const MetricsService = require('../services/MetricsService');
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

        sails.log.info('[metrics] GET /metrics endpoint registered');
      });
    }
  };
};
