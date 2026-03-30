# Sistema Scope

## Panoramica

Gli scope (scopi) sono **permessi granulari** assegnati agli utenti per controllare l'accesso alle diverse aree dell'API.

## Convenzione Nomi

```
{area}-{risorsa}-{azione}
```

Esempi:
- `asp5-anagrafica` — Accesso all'anagrafica
- `anagrafica-hl7_allergie-read` — Lettura allergie
- `mpi-ps_papardo-write` — Scrittura record MPI del PS Papardo
- `admin-manage` — Gestione amministrativa

## Wildcard

Gli scope supportano il carattere `*` per match parziali:

| Scope | Match |
|-------|-------|
| `anagrafica-hl7_allergie-read` | Solo allergie |
| `anagrafica-hl7_*-read` | Tutte le categorie HL7 |
| `anagrafica-siad_*-read` | Tutte le categorie SIAD |
| `anagrafica-*-read` | **Tutte** le categorie extra data |

Il matching e' implementato in `api/helpers/scope-matches.js`.

> **Importante**: usare sempre `sails.helpers.scopeMatches(userScopi, requiredScope)` invece di `Array.includes()` per gestire correttamente i wildcard.

## Scope per Area

### Anagrafica

| Scope | Descrizione |
|-------|-------------|
| `asp5-anagrafica` | Accesso base all'anagrafica (ricerca, dettaglio) |
| `cambio-medico` | Operazioni cambio medico |

### Extra Data (per categoria)

| Scope | Descrizione |
|-------|-------------|
| `anagrafica-{codice}-read` | Lettura categoria specifica |
| `anagrafica-{codice}-write` | Scrittura categoria specifica |
| `anagrafica-hl7_*-read/write` | Tutte categorie HL7 |
| `anagrafica-siad_*-read/write` | Tutte categorie SIAD |
| `anagrafica-*-read/write` | Tutte le categorie |

### MPI

| Scope | Descrizione |
|-------|-------------|
| `mpi-{appCodice}-read` | Lettura record app specifica |
| `mpi-{appCodice}-write` | Scrittura record app specifica |
| `mpi-link` | Collegamento record a assistiti |
| `mpi-search` | Ricerca cross-applicazione |

### Amministrazione

| Scope | Descrizione |
|-------|-------------|
| `admin-manage` | Gestione utenti, scope, categorie |
| `apps` | Gestione applicazioni Docker |

## Assegnazione

Gli scope vengono assegnati agli utenti tramite:
1. **Pannello Admin** — Sezione gestione utenti
2. **API Admin** — `POST /api/v1/admin/utenti/:id/scopi`

Un utente puo avere **multipli scope** simultaneamente.
