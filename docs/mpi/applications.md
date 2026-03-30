# Applicazioni MPI

## Panoramica

Ogni applicazione esterna che utilizza il MPI deve essere **registrata** come `MpiApplicazione`. Questo permette di:

- Tracciare l'origine di ogni record MPI
- Gestire i permessi per applicazione
- Effettuare ricerche cross-applicazione

## Modello

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `codice` | string | Codice unico (es. `PS_PAPARDO`) |
| `nome` | string | Nome descrittivo (es. "Pronto Soccorso Papardo") |
| `descrizione` | string | Descrizione estesa |
| `versione` | string | Versione dell'integrazione |
| `contatto` | string | Riferimento tecnico |
| `attivo` | boolean | Abilitazione |

## Gestione (Admin)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/mpi/applicazioni` | Lista applicazioni |
| `POST` | `/api/v1/admin/mpi/applicazioni` | Crea nuova applicazione |
| `PUT` | `/api/v1/admin/mpi/applicazioni/:id` | Modifica applicazione |
| `DELETE` | `/api/v1/admin/mpi/applicazioni/:id` | Disattiva applicazione |

## Permessi per Applicazione

Per ogni applicazione vengono creati scope dedicati:

| Scope | Descrizione |
|-------|-------------|
| `mpi-{codice}-read` | Lettura record dell'applicazione |
| `mpi-{codice}-write` | Creazione/modifica record |

Esempio per `PS_PAPARDO`:
- `mpi-ps_papardo-read`
- `mpi-ps_papardo-write`

Un utente con `mpi-search` puo cercare record di **tutte** le applicazioni.

## Esempio Integrazione

Un'applicazione esterna tipicamente:

1. Si registra come `MpiApplicazione` (una tantum, tramite admin)
2. Ottiene un utente con scope `mpi-{codice}-read` e `mpi-{codice}-write`
3. Crea record MPI con i dati del paziente + il proprio `idEsterno`
4. Successivamente (o immediatamente se ha il CF) effettua il link

```javascript
// 1. Crea record
POST /api/v1/mpi/record
{
  "idEsterno": "PAZ-2024-001",
  "cognome": "ROSSI",
  "nome": "MARIO",
  "sesso": "M",
  "dataNascita": "1980-01-01"
}

// 2. Collega quando si conosce il CF
POST /api/v1/mpi/record/{mpiId}/link
{
  "cf": "RSSMRA80A01F158Z"
}
```
