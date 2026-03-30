# Ricerca Assistiti

## Endpoint

```
POST /api/v1/anagrafica/ricerca
```

**Scope richiesto:** `asp5-anagrafica`

## Parametri di Ricerca

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `cf` | string | Codice fiscale (ricerca esatta) |
| `cognome` | string | Cognome (ricerca parziale) |
| `nome` | string | Nome (ricerca parziale) |
| `dataNascita` | string | Data di nascita |
| `comuneResidenza` | string | Comune di residenza |
| `sesso` | string | M/F |
| `limit` | number | Max risultati (default 50) |
| `forzaAggiornamentoTs` | boolean | Forza aggiornamento da SistemaTS |

## Comportamento

1. **Ricerca locale** nel database `anagrafica`
2. Se il parametro e' un **codice STP/ENI**, cerca anche nel SistemaTS
3. I risultati includono automaticamente gli **extra data** dell'assistito, filtrati per scope dell'utente
4. Integrazione **Meilisearch** per ricerca full-text su cognome e nome

## Risposta

```json
{
  "ok": true,
  "data": {
    "assistiti": [
      {
        "cf": "RSSMRA80A01F158Z",
        "cognome": "ROSSI",
        "nome": "MARIO",
        "sesso": "M",
        "dataNascita": "01/01/1980",
        "comuneResidenza": "MESSINA",
        "extraData": {
          "CONTATTI": { "cellulare_1": "333..." },
          "HL7_ALLERGIE": { "lista": [...] }
        }
      }
    ],
    "totale": 1
  }
}
```

## Extra Data nella Ricerca

Il controller `ricerca.js` include automaticamente gli extra data per ogni assistito trovato, utilizzando `sails.helpers.getExtraDataForAssistiti()`. I dati sono filtrati in base agli **scope dell'utente** che effettua la ricerca.

Ad esempio, un utente con scope `anagrafica-hl7_allergie-read` vedra' le allergie ma non i consensi (a meno che non abbia anche `anagrafica-hl7_consensi-read` o il wildcard `anagrafica-hl7_*-read`).
