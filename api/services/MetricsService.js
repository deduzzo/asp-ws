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
// Initialize all counters so they appear in /metrics output from boot
// (Grafana shows "No data" for counters that have never been incremented)
// ---------------------------------------------------------------------------

function initCounters() {
  // JWT auth
  jwtAuthTotal.inc({ result: 'valid' }, 0);
  jwtAuthTotal.inc({ result: 'expired' }, 0);
  jwtAuthTotal.inc({ result: 'invalid' }, 0);
  jwtAuthTotal.inc({ result: 'error' }, 0);

  // Login
  loginAttemptsTotal.inc({ method: 'local', result: 'success' }, 0);
  loginAttemptsTotal.inc({ method: 'local', result: 'failed' }, 0);
  loginAttemptsTotal.inc({ method: 'domain', result: 'success' }, 0);
  loginAttemptsTotal.inc({ method: 'domain', result: 'failed' }, 0);

  // Anagrafica
  anagraficaRicercaTotal.inc({ source: 'local' }, 0);
  anagraficaRicercaTotal.inc({ source: 'nar2' }, 0);
  anagraficaRicercaTotal.inc({ source: 'sistema_ts' }, 0);
  anagraficaUpsertTotal.inc({ operation: 'create' }, 0);
  anagraficaUpsertTotal.inc({ operation: 'update' }, 0);

  // Extra data
  extraDataOpsTotal.inc({ operation: 'get' }, 0);
  extraDataOpsTotal.inc({ operation: 'set' }, 0);
  extraDataOpsTotal.inc({ operation: 'delete' }, 0);

  // MPI
  mpiOpsTotal.inc({ operation: 'create' }, 0);
  mpiOpsTotal.inc({ operation: 'link' }, 0);
  mpiOpsTotal.inc({ operation: 'annulla' }, 0);

  // Cambio medico
  cambioMedicoTotal.inc({ operation: 'get_medici' }, 0);
  cambioMedicoTotal.inc({ operation: 'disponibili' }, 0);
  cambioMedicoTotal.inc({ operation: 'situazioni' }, 0);

  // Forms
  formSubmissionsTotal.inc({ result: 'success' }, 0);
  formSubmissionsTotal.inc({ result: 'rate_limited' }, 0);
  formSubmissionsTotal.inc({ result: 'captcha_failed' }, 0);
  formSubmissionsTotal.inc({ result: 'validation_error' }, 0);

  // Geo jobs
  geoJobsTotal.inc({ status: 'started' }, 0);
  geoJobsTotal.inc({ status: 'completed' }, 0);
  geoJobsTotal.inc({ status: 'failed' }, 0);

  // API errors
  apiErrorsTotal.inc({ action: '__init', error_type: 'validation' }, 0);
  apiErrorsTotal.inc({ action: '__init', error_type: 'auth' }, 0);
  apiErrorsTotal.inc({ action: '__init', error_type: 'not_found' }, 0);
  apiErrorsTotal.inc({ action: '__init', error_type: 'internal' }, 0);
  apiErrorsTotal.inc({ action: '__init', error_type: 'timeout' }, 0);
  apiErrorsTotal.inc({ action: '__init', error_type: 'service_unavailable' }, 0);
}

initCounters();

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
