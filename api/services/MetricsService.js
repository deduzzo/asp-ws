/**
 * MetricsService
 *
 * Prometheus metrics registry and helpers.
 * All metrics are in-memory counters/gauges/histograms — no DB queries on scrape.
 */

const client = require('prom-client');

// Custom registry (avoids polluting the global one)
const registry = new client.Registry();

// Default labels
registry.setDefaultLabels({ app: 'asp-ws' });

// Node.js runtime metrics (CPU, memory, event loop, GC)
client.collectDefaultMetrics({ register: registry });

// ---------------------------------------------------------------------------
// 1. HTTP metrics
// ---------------------------------------------------------------------------

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'action', 'status'],
  registers: [registry],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'action'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

const httpRequestsInFlight = new client.Gauge({
  name: 'http_requests_in_flight',
  help: 'HTTP requests currently being processed',
  registers: [registry],
});

// ---------------------------------------------------------------------------
// 2. Application errors
// ---------------------------------------------------------------------------

const apiErrorsTotal = new client.Counter({
  name: 'api_errors_total',
  help: 'Application errors by action and type',
  labelNames: ['action', 'error_type'],
  registers: [registry],
});

const apiUp = new client.Gauge({
  name: 'api_up',
  help: '1 if service is healthy, 0 if degraded (DB unreachable)',
  registers: [registry],
});
apiUp.set(1); // assume healthy on start

// ---------------------------------------------------------------------------
// 3. JWT auth
// ---------------------------------------------------------------------------

const jwtAuthTotal = new client.Counter({
  name: 'jwt_auth_total',
  help: 'JWT token validation outcomes',
  labelNames: ['result'],
  registers: [registry],
});

// ---------------------------------------------------------------------------
// 4. Business — Login
// ---------------------------------------------------------------------------

const loginAttemptsTotal = new client.Counter({
  name: 'login_attempts_total',
  help: 'Login attempts by method and result',
  labelNames: ['method', 'result'],
  registers: [registry],
});

// ---------------------------------------------------------------------------
// 5. Business — Anagrafica
// ---------------------------------------------------------------------------

const anagraficaRicercaTotal = new client.Counter({
  name: 'anagrafica_ricerca_total',
  help: 'Patient searches by data source',
  labelNames: ['source'],
  registers: [registry],
});

const anagraficaUpsertTotal = new client.Counter({
  name: 'anagrafica_upsert_total',
  help: 'Patient create/update operations',
  labelNames: ['operation'],
  registers: [registry],
});

// ---------------------------------------------------------------------------
// 6. Business — Extra Data
// ---------------------------------------------------------------------------

const extraDataOpsTotal = new client.Counter({
  name: 'extra_data_operations_total',
  help: 'Extra data operations by type',
  labelNames: ['operation'],
  registers: [registry],
});

// ---------------------------------------------------------------------------
// 7. Business — MPI
// ---------------------------------------------------------------------------

const mpiOpsTotal = new client.Counter({
  name: 'mpi_operations_total',
  help: 'MPI record operations',
  labelNames: ['operation'],
  registers: [registry],
});

// ---------------------------------------------------------------------------
// 8. Business — Cambio Medico
// ---------------------------------------------------------------------------

const cambioMedicoTotal = new client.Counter({
  name: 'cambio_medico_lookup_total',
  help: 'Doctor change lookups',
  labelNames: ['operation'],
  registers: [registry],
});

// ---------------------------------------------------------------------------
// 9. Business — Forms
// ---------------------------------------------------------------------------

const formSubmissionsTotal = new client.Counter({
  name: 'form_submissions_total',
  help: 'Form submission outcomes',
  labelNames: ['result'],
  registers: [registry],
});

// ---------------------------------------------------------------------------
// 10. Business — Geo jobs
// ---------------------------------------------------------------------------

const geoJobsTotal = new client.Counter({
  name: 'geo_jobs_total',
  help: 'Geolocation batch job outcomes',
  labelNames: ['status'],
  registers: [registry],
});

// ---------------------------------------------------------------------------
// Error type mapping: internal ERROR_TYPES -> Prometheus label
// ---------------------------------------------------------------------------

const ERROR_TYPE_MAP = {
  BAD_REQUEST: 'validation',
  NON_AUTORIZZATO: 'auth',
  TOKEN_NON_VALIDO: 'auth',
  TOKEN_SCADUTO: 'auth',
  NOT_FOUND: 'not_found',
  ALREADY_EXISTS: 'validation',
  ERRORE_GENERICO: 'internal',
  ERRORE_DEL_SERVER: 'internal',
  SERVIZIO_NON_DISPONIBILE: 'service_unavailable',
  TIMEOUT: 'timeout',
  MULTIPLE_ERRORS: 'internal',
};

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

  // Metrics objects (for direct use in middleware/hooks)
  httpRequestsTotal,
  httpRequestDuration,
  httpRequestsInFlight,
  apiErrorsTotal,
  apiUp,
  jwtAuthTotal,
  loginAttemptsTotal,
  anagraficaRicercaTotal,
  anagraficaUpsertTotal,
  extraDataOpsTotal,
  mpiOpsTotal,
  cambioMedicoTotal,
  formSubmissionsTotal,
  geoJobsTotal,

  // Error type mapping
  ERROR_TYPE_MAP,

  // Health check lifecycle
  startHealthCheck,
  stopHealthCheck,
};
