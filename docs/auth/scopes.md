# Sistema Scope

## Panoramica

Gli scope (scopi) sono **permessi granulari** assegnati agli utenti per controllare l'accesso alle diverse aree dell'API.

## Convenzione Nomi

```
{tipologia}_{risorsa}-{azione}
```

Esempi:
- `asp5-anagrafica` — Accesso all'anagrafica
- `clinico_allergie-read` — Lettura allergie
- `anagrafica_*-read` — Lettura di tutti i dati anagrafici
- `mpi-ps_papardo-write` — Scrittura record MPI del PS Papardo
- `admin-manage` — Gestione amministrativa

## Wildcard

Gli scope supportano il carattere `*` per match parziali:

| Scope | Match |
|-------|-------|
| `clinico_allergie-read` | Solo allergie |
| `clinico_*-read` | **Tutte** le categorie cliniche |
| `anagrafica_*-read` | **Tutte** le categorie anagrafiche |
| `*-read` | **Tutte** le categorie extra data |

Il matching e' implementato in `api/helpers/scope-matches.js`.

> **Importante**: usare sempre `sails.helpers.scopeMatches(userScopi, requiredScope)` invece di `Array.includes()` per gestire correttamente i wildcard.

## Scope per Area

### Anagrafica

| Scope | Descrizione |
|-------|-------------|
| `asp5-anagrafica` | Accesso base all'anagrafica (ricerca, dettaglio) |
| `cambio-medico` | Operazioni cambio medico |

### Extra Data (per categoria)

Le categorie extra data sono organizzate per **tipologia**:

#### Anagrafica (`anagrafica_*`)

| Scope | Categoria | Descrizione |
|-------|-----------|-------------|
| `anagrafica_contatti-read/write` | `ANAGRAFICA_CONTATTI` | Recapiti del paziente (cellulare, fisso, email, PEC) |
| `anagrafica_note-read/write` | `ANAGRAFICA_NOTE` | Note generiche |
| `anagrafica_extra-read/write` | `ANAGRAFICA_EXTRA` | Dati anagrafici aggiuntivi (stato civile, professione, titolo studio) |
| `anagrafica_contatti_emergenza-read/write` | `ANAGRAFICA_CONTATTI_EMERGENZA` | Contatti di emergenza (nome, relazione, telefono) |
| `anagrafica_*-read/write` | | **Wildcard**: tutte le categorie anagrafiche |

#### Clinico (`clinico_*`)

| Scope | Categoria | Descrizione |
|-------|-----------|-------------|
| `clinico_allergie-read/write` | `CLINICO_ALLERGIE` | Allergie e intolleranze |
| `clinico_patologie-read/write` | `CLINICO_PATOLOGIE` | Patologie croniche e diagnosi |
| `clinico_terapie-read/write` | `CLINICO_TERAPIE` | Terapie farmacologiche croniche |
| `clinico_parametri_vitali-read/write` | `CLINICO_PARAMETRI_VITALI` | Parametri vitali |
| `clinico_consensi-read/write` | `CLINICO_CONSENSI` | Consensi informati |
| `clinico_esenzioni-read/write` | `CLINICO_ESENZIONI` | Esenzioni SSN |
| `clinico_presa_in_carico-read/write` | `CLINICO_PRESA_IN_CARICO` | Presa in carico assistenza domiciliare (SIAD) |
| `clinico_valutazione_sanitaria-read/write` | `CLINICO_VALUTAZIONE_SANITARIA` | Valutazione sanitaria (SIAD) |
| `clinico_valutazione_sociale-read/write` | `CLINICO_VALUTAZIONE_SOCIALE` | Valutazione sociale (SIAD) |
| `clinico_*-read/write` | | **Wildcard**: tutte le categorie cliniche |

#### Globale

| Scope | Descrizione |
|-------|-------------|
| `*-read/write` | **Tutte** le categorie extra data |

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
