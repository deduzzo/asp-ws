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

## Architettura

Le metriche sono derivate dalla tabella **`metrics_counters`** del database `log` (counter atomici incrementati via `INSERT ... ON DUPLICATE KEY UPDATE`). Ad ogni scrape Prometheus, l'endpoint esegue una `SELECT *` sulla tabella e cacha i risultati per 15 secondi.

I counter vengono incrementati:
- automaticamente nel response handler `ApiResponse.js` per ogni risposta API (action, ambito, scope, errori)
- automaticamente nel policy `is-token-verified` per le validazioni JWT
- direttamente nei controller per metriche di business specifiche (es. `cambio_medico_*` in `api/controllers/cambio-medico/effettua-cambio.js` e `verifica.js`)

**Vantaggi:**
- Nessun middleware nell'hot path delle richieste (solo INSERT atomico fire-and-forget)
- Dati persistenti (sopravvivono ai restart)
- Ambito e scopi gia disponibili nei dati di richiesta

## Metriche esposte

### Richieste API (da Log)

| Metrica | Tipo | Label | Descrizione |
|---------|------|-------|-------------|
| `api_requests_total` | gauge | `action`, `tag`, `status` | Richieste API totali per action e status HTTP |
| `api_requests_by_ambito_total` | gauge | `ambito`, `tag` | Richieste per ambito (dominio utente) |
| `api_requests_by_scope_total` | gauge | `scope` | Richieste per scope utilizzato |

`tag`: `API_RESPONSE_OK`, `API_RESPONSE_KO`

### Autenticazione JWT (da Log)

| Metrica | Tipo | Label | Descrizione |
|---------|------|-------|-------------|
| `jwt_auth_total` | gauge | `result` | Validazioni JWT (`valid`, `invalid`) |

### MPI (da Log)

| Metrica | Tipo | Label | Descrizione |
|---------|------|-------|-------------|
| `mpi_operations_total` | gauge | `operation` | Operazioni MPI (`create`, `link`, `annulla`, `update`) |

### Forms (da Log)

| Metrica | Tipo | Label | Descrizione |
|---------|------|-------|-------------|
| `form_submissions_total` | gauge | `result` | Form submissions (`success`, `error`) |

### Cambio Medico (da metrics_counters)

| Metrica | Tipo | Label | Descrizione |
|---------|------|-------|-------------|
| `cambio_medico_submit_total` | gauge | `esito` | Submit cambio medico verso NAR2: `ok` (POST riuscita), `ko` (POST fallita), `dry_run` (solo payload generato) |
| `cambio_medico_verifica_total` | gauge | `esito` | Verifica medico assegnato su NAR2 e TS: `coerenti` (NAR2 e TS allineati), `divergenti` (medici diversi), `ts_non_aggiornato` (TS non ha medico, NAR2 si), `nar2_non_aggiornato` (NAR2 non ha medico, TS si), `errore` (entrambi i sistemi inaccessibili) |

**Allerte consigliate:**
- `rate(cambio_medico_submit_total{esito="ko"}[5m]) > 0` → submit cambio medico falliti
- `rate(cambio_medico_verifica_total{esito="divergenti"}[1h]) > 0` → divergenze persistenti NAR2 vs TS (trigger NAR2→TS non funziona o overridden)
- `rate(cambio_medico_verifica_total{esito="ts_non_aggiornato"}[1h]) / rate(cambio_medico_verifica_total[1h]) > 0.1` → trigger NAR2→TS lento

### Health

| Metrica | Tipo | Label | Descrizione |
|---------|------|-------|-------------|
| `api_up` | gauge | — | 1=healthy, 0=almeno un DB non raggiungibile |

### Node.js runtime (automatiche)

`process_cpu_seconds_total`, `process_resident_memory_bytes`, `nodejs_heap_size_total_bytes`, `nodejs_heap_size_used_bytes`, `nodejs_eventloop_lag_seconds`, `nodejs_active_handles_total`

## Query PromQL utili

### Richieste OK vs KO negli ultimi 5 minuti
```promql
sum(api_requests_total{tag="API_RESPONSE_OK"}) 
```

### Richieste per action (top 10)
```promql
topk(10, api_requests_total{tag="API_RESPONSE_OK"})
```

### Errori per action
```promql
topk(10, api_requests_total{tag="API_RESPONSE_KO"})
```

### Distribuzione per ambito
```promql
api_requests_by_ambito_total
```

### Scope piu utilizzati
```promql
topk(10, api_requests_by_scope_total)
```

### JWT falliti
```promql
jwt_auth_total{result="invalid"}
```

### Cambi medico effettuati con successo (non dry-run)
```promql
cambio_medico_submit_total{esito="ok"}
```

### Divergenze NAR2 vs TS persistenti
```promql
cambio_medico_verifica_total{esito="divergenti"}
```

### Tasso di sincronia TS dopo cambio medico
```promql
cambio_medico_verifica_total{esito="coerenti"} /
  ignoring(esito) sum without(esito)(cambio_medico_verifica_total)
```

### Operazioni MPI per tipo
```promql
mpi_operations_total
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
