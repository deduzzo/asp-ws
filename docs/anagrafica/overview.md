# Anagrafica Assistiti

## Panoramica

Il modulo Anagrafica gestisce il registro centrale dei pazienti (assistiti) dell'ASP di Messina. Ogni assistito e' identificato univocamente dal **codice fiscale** (campo `cf`).

## Modello Dati

### Campi principali `Anagrafica_Assistiti`

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `cf` | string | Codice fiscale (PK, unico) |
| `cfNormalizzato` | string | CF normalizzato per ricerca |
| `cognome` | string | Cognome |
| `nome` | string | Nome |
| `sesso` | string | M/F |
| `dataNascita` | number | Timestamp Unix nascita |
| `comuneNascita` | string | Comune di nascita (o nazionalita per stranieri) |
| `codComuneNascita` | string | Codice comune nascita |
| `codIstatComuneNascita` | string | Codice ISTAT 6 cifre nascita |
| `provinciaNascita` | string | Sigla provincia nascita |
| `indirizzoResidenza` | string | Indirizzo di residenza |
| `capResidenza` | string | CAP residenza |
| `comuneResidenza` | string | Comune residenza |
| `codComuneResidenza` | string | Codice comune residenza |
| `codIstatComuneResidenza` | string | Codice ISTAT residenza |
| `asp` | string | ASL di appartenenza |
| `ssnTipoAssistito` | string | Tipologia assistito |
| `ssnInizioAssistenza` | number | Inizio assistenza SSN |
| `ssnFineAssistenza` | number | Fine assistenza SSN |
| `ssnNumeroTessera` | string | Numero tessera sanitaria |
| `dataDecesso` | number | Data decesso (se deceduto) |
| `lat`, `long` | number | Coordinate geolocalizzazione |
| `geolocPrecise` | boolean | Precisione geolocalizzazione |

### Dati Medico di Base (MMG)

| Campo | Descrizione |
|-------|-------------|
| `ssnMMGTipo` | Tipologia medico (MMG/PLS) |
| `ssnMMGCodReg` | Codice regionale medico |
| `ssnMMGNome`, `ssnMMGCognome` | Nominativo medico |
| `ssnMMGCf` | Codice fiscale medico |
| `ssnMMGDataScelta` | Data scelta medico |
| `ssnMMGDataRevoca` | Data revoca medico |

## Integrazione SistemaTS

Per i codici STP/ENI (Stranieri Temporaneamente Presenti), il sistema si integra con il **SistemaTS del MEF** per recuperare i dati anagrafici:

1. Il codice STP/ENI viene parsato dal `AssistitoService.parseCodiceStp()`
2. I dati vengono recuperati dal servizio TS
3. L'assistito viene creato/aggiornato nel registro locale
4. Per gli stranieri, il campo `comuneNascita` contiene la **nazionalita** (es. "GAMBIA")

## Geolocalizzazione

Gli indirizzi vengono geolocalizzati automaticamente tramite servizi di geocoding. Le coordinate (`lat`, `long`) vengono utilizzate da Turf.js per operazioni geospaziali.
