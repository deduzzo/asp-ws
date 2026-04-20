/**
 * MetricsService
 *
 * Prometheus metrics from the metrics_counters table.
 * Counters are atomically incremented via the metrics-inc helper
 * (INSERT ON DUPLICATE KEY UPDATE). On each /metrics scrape,
 * a simple SELECT * reads all rows (cached 15s).
 */

const client = require('prom-client');

// Custom registry
const registry = new client.Registry();
registry.setDefaultLabels({ app: 'asp-ws' });

// Node.js runtime metrics (CPU, memory, event loop, GC)
client.collectDefaultMetrics({ register: registry });

// ---------------------------------------------------------------------------
// Gauges — populated from metrics_counters rows on each scrape
// ---------------------------------------------------------------------------

const metrics = {
  api_requests: new client.Gauge({
    name: 'api_requests_total',
    help: 'Total API requests by action and HTTP status',
    labelNames: ['action', 'status'],
    registers: [registry],
  }),
  api_requests_by_ambito: new client.Gauge({
    name: 'api_requests_by_ambito_total',
    help: 'Total API requests by ambito (domain) and result',
    labelNames: ['ambito', 'tag'],
    registers: [registry],
  }),
  api_requests_by_scope: new client.Gauge({
    name: 'api_requests_by_scope_total',
    help: 'Total API requests by scope',
    labelNames: ['scope'],
    registers: [registry],
  }),
  api_errors: new client.Gauge({
    name: 'api_errors_total',
    help: 'Application errors by action and error type',
    labelNames: ['action', 'error_type'],
    registers: [registry],
  }),
  jwt_auth: new client.Gauge({
    name: 'jwt_auth_total',
    help: 'JWT token validations by result',
    labelNames: ['result'],
    registers: [registry],
  }),
};

const apiUp = new client.Gauge({
  name: 'api_up',
  help: '1 if service is healthy, 0 if degraded (DB unreachable)',
  registers: [registry],
});
apiUp.set(1);

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

let cacheTimestamp = 0;
const CACHE_TTL_MS = 15000;

// ---------------------------------------------------------------------------
// Refresh metrics from metrics_counters table
// ---------------------------------------------------------------------------

async function refreshMetricsFromDb() {
  const now = Date.now();
  if ((now - cacheTimestamp) < CACHE_TTL_MS) {
    return;
  }

  try {
    const db = Log.getDatastore();
    const result = await db.sendNativeQuery(
      'SELECT metric, label1_name, label1_value, label2_name, label2_value, cnt FROM metrics_counters'
    );

    // Reset all gauges
    for (const gauge of Object.values(metrics)) {
      gauge.reset();
    }

    // Populate from rows
    for (const row of result.rows) {
      const gauge = metrics[row.metric];
      if (!gauge) continue;

      const labels = {};
      if (row.label1_name) labels[row.label1_name] = row.label1_value;
      if (row.label2_name) labels[row.label2_name] = row.label2_value;

      gauge.set(labels, Number(row.cnt));
    }

    cacheTimestamp = now;
    apiUp.set(1);
  } catch (err) {
    sails.log.error('[metrics] Error reading metrics_counters:', err.message);
    apiUp.set(0);
  }
}

// ---------------------------------------------------------------------------
// Health check — runs every 30s, tests SELECT 1 on each datastore
// ---------------------------------------------------------------------------

const DATASTORE_MODELS = {
  anagrafica: 'Anagrafica_Assistiti',
  auth: 'Auth_Utenti',
  log: 'Log',
};

let healthCheckInterval = null;

function startHealthCheck() {
  if (healthCheckInterval) return;
  healthCheckInterval = setInterval(async () => {
    try {
      const checks = Object.entries(DATASTORE_MODELS).map(async ([, modelName]) => {
        const model = sails.models[modelName.toLowerCase()];
        if (!model) return;
        await model.getDatastore().sendNativeQuery('SELECT 1');
      });
      await Promise.all(checks);
      apiUp.set(1);
    } catch (unusedErr) {
      apiUp.set(0);
    }
  }, 30000);
}

function stopHealthCheck() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  registry,
  apiUp,
  refreshMetricsFromDb,
  startHealthCheck,
  stopHealthCheck,
};
