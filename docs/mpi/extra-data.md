# Extra Data su Record MPI

## Panoramica

I record MPI possono avere **extra data** associati, esattamente come gli assistiti dell'anagrafica. Questo permette di registrare dati clinici (allergie, patologie, valutazioni) anche per pazienti **non ancora identificati**.

Le categorie disponibili sono le stesse dell'anagrafica (CLINICO_*, ANAGRAFICA_*, ecc.).

## API

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/v1/mpi/record/:mpiId/extra-data` | Leggi extra data |
| `POST` | `/api/v1/mpi/record/:mpiId/extra-data` | Scrivi extra data |
| `DELETE` | `/api/v1/mpi/record/:mpiId/extra-data` | Elimina extra data |
| `GET` | `/api/v1/mpi/record/:mpiId/extra-data/storico` | Storico modifiche |

## Permessi

Per accedere agli extra data MPI servono **due scope**:

1. **Scope MPI**: `mpi-{appCodice}-read` o `mpi-{appCodice}-write`
2. **Scope categoria**: `{categoria}-read` o `{categoria}-write`

Esempio: per scrivere allergie su un record del PS Papardo servono:
- `mpi-ps_papardo-write` (accesso al record MPI)
- `clinico_allergie-write` (accesso alla categoria allergie)

## Esempio

### Scrittura

```json
POST /api/v1/mpi/record/{mpiId}/extra-data
{
  "categoria": "CLINICO_ALLERGIE",
  "valori": {
    "lista": [
      {
        "sostanza": "Penicillina",
        "tipo": "farmaco",
        "criticita": "alta",
        "stato": "attiva"
      }
    ]
  }
}
```

### Lettura

```json
GET /api/v1/mpi/record/{mpiId}/extra-data?categoria=CLINICO_ALLERGIE

// Risposta
{
  "ok": true,
  "data": {
    "CLINICO_ALLERGIE": {
      "lista": [{"sostanza": "Penicillina", ...}]
    }
  }
}
```

## Tabelle Database

I dati MPI extra data usano tabelle dedicate (separate da quelle degli assistiti):

| Tabella | Descrizione |
|---------|-------------|
| `mpi_extra_data_valori` | Valori correnti per record/categoria/chiave |
| `mpi_extra_data_storico` | Audit trail modifiche |

## Validazione

La validazione e' identica a quella degli assistiti:
- I nomi dei campi devono corrispondere allo schema della categoria
- I campi JSON vengono validati contro lo schema (tipi, enum, date, obbligatorieta)
- Ogni modifica viene registrata nello storico con vecchio e nuovo valore
