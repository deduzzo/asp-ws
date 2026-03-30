# Sistema Extra Data

## Panoramica

Il sistema Extra Data permette di aggiungere **dati dinamici strutturati** agli assistiti, organizzati per **categorie** con schema di validazione, versionamento e controllo accessi basato su scope.

## Architettura

```mermaid
graph TD
    CAT[Categoria<br/>es. HL7_ALLERGIE] --> |definisce schema| VAL[Valori<br/>per assistito/chiave]
    VAL --> |ogni modifica| STOR[Storico<br/>audit trail]
    CAT --> |scope lettura| READ[anagrafica-hl7_allergie-read]
    CAT --> |scope scrittura| WRITE[anagrafica-hl7_allergie-write]
```

## Modelli

| Modello | Tabella | Descrizione |
|---------|---------|-------------|
| `Anagrafica_ExtraDataCategorie` | `extra_data_categorie` | Definizioni categorie con schema campi |
| `Anagrafica_ExtraDataValori` | `extra_data_valori` | Valori correnti per assistito/categoria/chiave |
| `Anagrafica_ExtraDataStorico` | `extra_data_storico` | Audit trail di tutte le modifiche |

## Struttura Categoria

Ogni categoria definisce:

| Campo | Descrizione |
|-------|-------------|
| `codice` | Identificativo unico (es. `HL7_ALLERGIE`) |
| `descrizione` | Descrizione leggibile |
| `scopoLettura` | Scope richiesto per leggere (es. `anagrafica-hl7_allergie-read`) |
| `scopoScrittura` | Scope richiesto per scrivere |
| `campi` | JSON array con schema dei campi ammessi |
| `attivo` | Abilitazione categoria |

### Schema Campi

Ogni campo nella definizione ha:

```json
{
  "chiave": "nome_campo",
  "tipo": "string",
  "obbligatorio": true,
  "etichetta": "Etichetta visualizzata"
}
```

**Tipi supportati:** `string`, `number`, `boolean`, `date`, `json`

Il tipo `json` e' usato per dati multi-valore (es. lista allergie, lista terapie). Il contenuto JSON viene validato contro lo schema definito nella categoria tramite `api/helpers/validate-extra-data-json.js`.

## API Pubbliche

Tutte richiedono scope `asp5-anagrafica` + scope specifico della categoria.

### Leggere extra data

```
GET /api/v1/anagrafica/extra-data/:cf
GET /api/v1/anagrafica/extra-data/:cf?categoria=HL7_ALLERGIE
```

Risposta:
```json
{
  "ok": true,
  "data": {
    "HL7_ALLERGIE": {
      "lista": [{"sostanza": "Penicillina", "tipo": "farmaco", "criticita": "alta"}]
    },
    "CONTATTI": {
      "cellulare_1": "333...",
      "email": "mario@example.com"
    }
  }
}
```

> I dati restituiti sono filtrati automaticamente in base agli scope dell'utente.

### Scrivere extra data

```
POST /api/v1/anagrafica/extra-data/:cf
```

Body:
```json
{
  "categoria": "CONTATTI",
  "valori": {
    "cellulare_1": "3331234567",
    "email": "mario@example.com"
  }
}
```

### Eliminare extra data

```
DELETE /api/v1/anagrafica/extra-data/:cf
```

Body:
```json
{
  "categoria": "CONTATTI",
  "chiavi": ["cellulare_1"]
}
```

### Storico modifiche

```
GET /api/v1/anagrafica/extra-data/:cf/storico
GET /api/v1/anagrafica/extra-data/:cf/storico?categoria=HL7_ALLERGIE
```

### Lista categorie disponibili

```
GET /api/v1/anagrafica/extra-data-categorie/summary
```

## Categorie Disponibili

### Categorie HL7

| Codice | Descrizione | Tipo dati |
|--------|-------------|-----------|
| `HL7_CONTATTI_EMERGENZA` | Contatti di emergenza | Campi singoli |
| `HL7_ALLERGIE` | Allergie e intolleranze | JSON lista |
| `HL7_PATOLOGIE_CRONICHE` | Patologie croniche | JSON lista |
| `HL7_ESENZIONI` | Esenzioni SSN | JSON lista |
| `HL7_TERAPIE_CRONICHE` | Terapie farmacologiche | JSON lista |
| `HL7_PARAMETRI_VITALI` | Parametri vitali | Campi singoli |
| `HL7_CONSENSI` | Consensi informati | JSON lista |
| `HL7_ANAGRAFICA_EXTRA` | Stato civile, professione, titolo studio | Campi singoli |

### Categorie SIAD

| Codice | Descrizione | Tipo dati |
|--------|-------------|-----------|
| `SIAD_PRESA_IN_CARICO` | Presa in carico assistenza domiciliare | Campi singoli |
| `SIAD_VALUTAZIONE_SANITARIA` | Valutazione sanitaria | Campi singoli (si/no) |
| `SIAD_VALUTAZIONE_SOCIALE` | Valutazione sociale | Campi singoli |

### Categorie Generiche

| Codice | Descrizione | Tipo dati |
|--------|-------------|-----------|
| `CONTATTI` | Recapiti telefonici e email | Campi singoli |
| `EXTRA` | Note generiche | Campi singoli |

## Wildcard Scope

Il sistema supporta scope con wildcard `*`:

| Scope | Accesso |
|-------|---------|
| `anagrafica-hl7_allergie-read` | Solo allergie |
| `anagrafica-hl7_*-read` | Tutte le categorie HL7 |
| `anagrafica-siad_*-read` | Tutte le categorie SIAD |
| `anagrafica-*-read` | **Tutte** le categorie extra data |

Il matching viene eseguito da `api/helpers/scope-matches.js`.
