/**
 * MetricsService
 *
 * Prometheus metrics from the Log database table.
 * On each /metrics scrape, runs aggregate queries on the Log table
 * and caches the results for 15 seconds.
 * No in-memory counters, no middleware — all data comes from the DB.
 */

const client = require('prom-client');

// Custom registry
const registry = new client.Registry();
registry.setDefaultLabels({ app: 'asp-ws' });

// Node.js runtime metrics (CPU, memory, event loop, GC)
client.collectDefaultMetrics({ register: registry });

// ---------------------------------------------------------------------------
// Gauges — set from DB queries on each scrape (not counters, because the
// values come from COUNT(*) which is already a running total)
// ---------------------------------------------------------------------------

const apiRequestsTotal = new client.Gauge({
  name: 'api_requests_total',
  help: 'Total API requests from log (by action, status, tag)',
  labelNames: ['action', 'tag', 'status'],
  registers: [registry],
});

const apiRequestsByAmbito = new client.Gauge({
  name: 'api_requests_by_ambito_total',
  help: 'Total API requests by ambito (domain)',
  labelNames: ['ambito', 'tag'],
  registers: [registry],
});

const apiRequestsByScope = new client.Gauge({
  name: 'api_requests_by_scope_total',
  help: 'Total API requests by scope',
  labelNames: ['scope'],
  registers: [registry],
});

const jwtAuthTotal = new client.Gauge({
  name: 'jwt_auth_total',
  help: 'JWT token validations by result',
  labelNames: ['result'],
  registers: [registry],
});

const mpiOpsTotal = new client.Gauge({
  name: 'mpi_operations_total',
  help: 'MPI record operations by type',
  labelNames: ['operation'],
  registers: [registry],
});

const formSubmissionsTotal = new client.Gauge({
  name: 'form_submissions_total',
  help: 'Form submissions by result',
  labelNames: ['result'],
  registers: [registry],
});

const apiUp = new client.Gauge({
  name: 'api_up',
  help: '1 if service is healthy, 0 if degraded (DB unreachable)',
  registers: [registry],
});
apiUp.set(1);

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

let cachedMetrics = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 15000; // 15 seconds

// ---------------------------------------------------------------------------
// Tag -> metric mapping
// ---------------------------------------------------------------------------

const TAG_TO_MPI_OP = {
  MPI_CREATE: 'create',
  MPI_LINK: 'link',
  MPI_ANNULLA: 'annulla',
  MPI_UPDATE: 'update',
};

// ---------------------------------------------------------------------------
// Query and refresh metrics from Log table
// ---------------------------------------------------------------------------

async function refreshMetricsFromDb() {
  const now = Date.now();
  if (cachedMetrics && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return; // cache still valid
  }

  try {
    const db = sails.models.log.getDatastore();

    // 1. Requests by action + tag (OK/KO) with statusCode from context
    const requestsResult = await db.sendNativeQuery(`
      SELECT action, tag,
             JSON_UNQUOTE(JSON_EXTRACT(context, '$.statusCode')) as status_code,
             COUNT(*) as cnt
      FROM log
      WHERE tag IN ('API_RESPONSE_OK', 'API_RESPONSE_KO')
      GROUP BY action, tag, status_code
    `);
    apiRequestsTotal.reset();
    for (const row of requestsResult.rows) {
      apiRequestsTotal.set(
        { action: row.action || '__unknown', tag: row.tag, status: row.status_code || 'unknown' },
        Number(row.cnt)
      );
    }

    // 2. Requests by ambito
    const ambitoResult = await db.sendNativeQuery(`
      SELECT JSON_UNQUOTE(JSON_EXTRACT(context, '$.ambito')) as ambito, tag, COUNT(*) as cnt
      FROM log
      WHERE tag IN ('API_RESPONSE_OK', 'API_RESPONSE_KO')
        AND JSON_EXTRACT(context, '$.ambito') IS NOT NULL
      GROUP BY ambito, tag
    `);
    apiRequestsByAmbito.reset();
    for (const row of ambitoResult.rows) {
      if (row.ambito && row.ambito !== 'null') {
        apiRequestsByAmbito.set({ ambito: row.ambito, tag: row.tag }, Number(row.cnt));
      }
    }

    // 3. Requests by scope — flatten the scopi array
    const scopiResult = await db.sendNativeQuery(`
      SELECT scope.scope as scope_name, COUNT(*) as cnt
      FROM log,
           JSON_TABLE(context, '$.scopi[*]' COLUMNS (scope VARCHAR(100) PATH '$')) as scope
      WHERE tag IN ('API_RESPONSE_OK', 'API_RESPONSE_KO')
        AND JSON_EXTRACT(context, '$.scopi') IS NOT NULL
      GROUP BY scope.scope
    `);
    apiRequestsByScope.reset();
    for (const row of scopiResult.rows) {
      if (row.scope_name) {
        apiRequestsByScope.set({ scope: row.scope_name }, Number(row.cnt));
      }
    }

    // 4. JWT auth results
    const jwtResult = await db.sendNativeQuery(`
      SELECT tag, COUNT(*) as cnt
      FROM log
      WHERE tag IN ('TOKEN_VERIFY_OK', 'TOKEN_VERIFY_KO')
      GROUP BY tag
    `);
    jwtAuthTotal.reset();
    for (const row of jwtResult.rows) {
      const result = row.tag === 'TOKEN_VERIFY_OK' ? 'valid' : 'invalid';
      jwtAuthTotal.set({ result }, Number(row.cnt));
    }

    // 5. MPI operations
    const mpiResult = await db.sendNativeQuery(`
      SELECT tag, COUNT(*) as cnt
      FROM log
      WHERE tag IN ('MPI_CREATE', 'MPI_LINK', 'MPI_ANNULLA', 'MPI_UPDATE')
      GROUP BY tag
    `);
    mpiOpsTotal.reset();
    for (const row of mpiResult.rows) {
      const op = TAG_TO_MPI_OP[row.tag] || row.tag;
      mpiOpsTotal.set({ operation: op }, Number(row.cnt));
    }

    // 6. Form submissions
    const formsResult = await db.sendNativeQuery(`
      SELECT tag, COUNT(*) as cnt
      FROM log
      WHERE tag IN ('FORM_SUBMISSION', 'FORM_SUBMISSION_ERROR')
      GROUP BY tag
    `);
    formSubmissionsTotal.reset();
    for (const row of formsResult.rows) {
      const result = row.tag === 'FORM_SUBMISSION' ? 'success' : 'error';
      formSubmissionsTotal.set({ result }, Number(row.cnt));
    }

    cacheTimestamp = now;
    cachedMetrics = true;
    apiUp.set(1);
  } catch (err) {
    sails.log.error('[metrics] Error querying log table:', err.message);
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
