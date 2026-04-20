# Metriche Prometheus

## Configurazione

L'endpoint `/metrics` espone metriche in formato Prometheus text exposition.

### File di configurazione

Crea `config/custom/private_metrics_config.json` (vedi `example_private_metrics_config.json`):

```json
{
  "METRICS_ENABLED": true,
  "METRICS_USER": "metrics",
  "METRICS_PASS": "la-tua-password"
}
```

| Campo | Default | Descrizione |
|-------|---------|-------------|
| `METRICS_ENABLED` | `true` | Abilita/disabilita l'endpoint |
| `METRICS_USER` | `metrics` | Username per basic auth |
| `METRICS_PASS` | *(obbligatoria)* | Password per basic auth. Se non impostata, l'endpoint risponde 503 |

Se il file non esiste, l'endpoint viene disabilitato automaticamente.

### Accesso

```bash
curl -u metrics:LA_TUA_PASSWORD http://localhost:1337/metrics
```

**Content-Type:** `text/plain; version=0.0.4; charset=utf-8`

L'endpoint usa basic auth HTTP (non JWT), bypassando completamente il routing e le policy Sails.

## Metriche esposte

### HTTP (automatiche su tutte le rotte)

| Metrica | Tipo | Label | Descrizione |
|---------|------|-------|-------------|
| `http_requests_total` | counter | `method`, `action`, `status` | Totale richieste HTTP |
| `http_request_duration_seconds` | histogram | `method`, `action` | Latenza richieste (bucket: 5ms-10s) |
| `http_requests_in_flight` | gauge | — | Richieste in corso |

Il label `action` usa `req.options.action` di Sails (es. `anagrafica/ricerca`, `login/get-token`) — normalizzato, nessun rischio di cardinalita.

### Errori applicativi

| Metrica | Tipo | Label | Descrizione |
|---------|------|-------|-------------|
| `api_errors_total` | counter | `action`, `error_type` | Errori per tipo |
| `api_up` | gauge | — | 1=healthy, 0=almeno un DB non raggiungibile |

Valori `error_type`: `validation`, `auth`, `not_found`, `internal`, `timeout`, `service_unavailable`

### Autenticazione JWT

| Metrica | Tipo | Label | Descrizione |
|---------|------|-------|-------------|
| `jwt_auth_total` | counter | `result` | Validazioni token JWT |

Valori `result`: `valid`, `expired`, `invalid`, `error`

### Business — Login

| Metrica | Tipo | Label | Descrizione |
|---------|------|-------|-------------|
| `login_attempts_total` | counter | `method`, `result` | Tentativi di autenticazione |

`method`: `local`, `domain` — `result`: `success`, `failed`

### Business — Anagrafica

| Metrica | Tipo | Label | Descrizione |
|---------|------|-------|-------------|
| `anagrafica_ricerca_total` | counter | `source` | Ricerche per fonte dati |
| `anagrafica_upsert_total` | counter | `operation` | Creazione/aggiornamento pazienti |

`source`: `local`, `nar2`, `sistema_ts` — `operation`: `create`, `update`

### Business — Extra Data

| Metrica | Tipo | Label | Descrizione |
|---------|------|-------|-------------|
| `extra_data_operations_total` | counter | `operation` | Operazioni sui dati extra |

`operation`: `get`, `set`, `delete`

### Business — MPI

| Metrica | Tipo | Label | Descrizione |
|---------|------|-------|-------------|
| `mpi_operations_total` | counter | `operation` | Operazioni Master Patient Index |

`operation`: `create`, `link`, `annulla`

### Business — Cambio Medico

| Metrica | Tipo | Label | Descrizione |
|---------|------|-------|-------------|
| `cambio_medico_lookup_total` | counter | `operation` | Lookup cambio medico |

`operation`: `get_medici`, `disponibili`, `situazioni`

### Business — Forms

| Metrica | Tipo | Label | Descrizione |
|---------|------|-------|-------------|
| `form_submissions_total` | counter | `result` | Invii form dinamici |

`result`: `success`, `rate_limited`, `captcha_failed`, `validation_error`

### Business — Geolocalizzazione

| Metrica | Tipo | Label | Descrizione |
|---------|------|-------|-------------|
| `geo_jobs_total` | counter | `status` | Job batch di geocoding |

`status`: `started`, `completed`, `failed`

### Node.js runtime (automatiche)

`process_cpu_seconds_total`, `process_resident_memory_bytes`, `nodejs_heap_size_total_bytes`, `nodejs_heap_size_used_bytes`, `nodejs_eventloop_lag_seconds`, `nodejs_active_handles_total`, `nodejs_gc_duration_seconds`

## Cardinalita stimata

- ~50 action x 5 status x 3 metodi = ~750 serie per `http_requests_total`
- Metriche business: ~50 serie totali (label a cardinalita fissa)
- Runtime Node.js: ~30 serie
- **Totale: ~1000-1500 serie** — leggero per Prometheus

## Health check

Il gauge `api_up` e' aggiornato ogni 30 secondi con un `SELECT 1` su ciascuno dei 3 datastore (anagrafica, auth, log). Se almeno una connessione fallisce, il valore scende a 0.

## Query PromQL utili

### Tasso errori 5xx (ultimi 5 minuti)
```promql
sum(rate(http_requests_total{status=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))
```

### Latenza p95 per action
```promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, action))
```

### Top 5 endpoint piu lenti (p99)
```promql
topk(5, histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, action)))
```

### Richieste al secondo per action
```promql
sum(rate(http_requests_total[5m])) by (action)
```

### Login falliti negli ultimi 15 minuti
```promql
sum(increase(login_attempts_total{result="failed"}[15m])) by (method)
```

### Token JWT scaduti o invalidi
```promql
sum(rate(jwt_auth_total{result=~"expired|invalid|error"}[5m]))
```

### Ricerche anagrafica per fonte
```promql
sum(rate(anagrafica_ricerca_total[5m])) by (source)
```

### Operazioni MPI per tipo
```promql
sum(increase(mpi_operations_total[1h])) by (operation)
```

### Form: tasso di successo
```promql
sum(rate(form_submissions_total{result="success"}[5m]))
/
sum(rate(form_submissions_total[5m]))
```

### Errori applicativi per tipo
```promql
sum(rate(api_errors_total[5m])) by (error_type)
```

### Service health
```promql
api_up{app="asp-ws"}
```

### Memoria heap usata
```promql
nodejs_heap_size_used_bytes{app="asp-ws"} / 1024 / 1024
```

## Configurazione Prometheus

Esempio di scrape config per `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'asp-ws'
    scrape_interval: 15s
    metrics_path: /metrics
    basic_auth:
      username: metrics
      password: LA_TUA_PASSWORD
    static_configs:
      - targets: ['<HOST_API>:1337']
        labels:
          environment: production
```

## Output di esempio

```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="POST",action="anagrafica/ricerca",status="200",app="asp-ws"} 1523
http_requests_total{method="POST",action="login/get-token",status="200",app="asp-ws"} 342
http_requests_total{method="POST",action="login/get-token",status="401",app="asp-ws"} 18
http_requests_total{method="GET",action="anagrafica/extra-data/get",status="200",app="asp-ws"} 890
http_requests_total{method="POST",action="mpi/create",status="200",app="asp-ws"} 45

# HELP http_request_duration_seconds HTTP request latency in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="POST",action="anagrafica/ricerca",le="0.1",app="asp-ws"} 1200
http_request_duration_seconds_bucket{method="POST",action="anagrafica/ricerca",le="0.5",app="asp-ws"} 1480

# HELP http_requests_in_flight HTTP requests currently being processed
# TYPE http_requests_in_flight gauge
http_requests_in_flight{app="asp-ws"} 3

# HELP api_errors_total Application errors by action and type
# TYPE api_errors_total counter
api_errors_total{action="anagrafica/ricerca",error_type="not_found",app="asp-ws"} 42
api_errors_total{action="login/get-token",error_type="auth",app="asp-ws"} 18

# HELP api_up 1 if service is healthy, 0 if degraded (DB unreachable)
# TYPE api_up gauge
api_up{app="asp-ws"} 1

# HELP jwt_auth_total JWT token validation outcomes
# TYPE jwt_auth_total counter
jwt_auth_total{result="valid",app="asp-ws"} 2891
jwt_auth_total{result="expired",app="asp-ws"} 23
jwt_auth_total{result="invalid",app="asp-ws"} 5

# HELP login_attempts_total Login attempts by method and result
# TYPE login_attempts_total counter
login_attempts_total{method="local",result="success",app="asp-ws"} 310
login_attempts_total{method="domain",result="success",app="asp-ws"} 32
login_attempts_total{method="local",result="failed",app="asp-ws"} 15

# HELP anagrafica_ricerca_total Patient searches by data source
# TYPE anagrafica_ricerca_total counter
anagrafica_ricerca_total{source="local",app="asp-ws"} 1523
anagrafica_ricerca_total{source="nar2",app="asp-ws"} 89
anagrafica_ricerca_total{source="sistema_ts",app="asp-ws"} 12

# HELP mpi_operations_total MPI record operations
# TYPE mpi_operations_total counter
mpi_operations_total{operation="create",app="asp-ws"} 45
mpi_operations_total{operation="link",app="asp-ws"} 38
mpi_operations_total{operation="annulla",app="asp-ws"} 2

# HELP form_submissions_total Form submission outcomes
# TYPE form_submissions_total counter
form_submissions_total{result="success",app="asp-ws"} 127
form_submissions_total{result="rate_limited",app="asp-ws"} 3
```
