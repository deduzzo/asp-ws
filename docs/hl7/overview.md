# HL7 - Dati Clinici

## Panoramica

Il sistema gestisce dati clinici strutturati ispirati allo standard **HL7 v2.5** e **FHIR**. Non si tratta di un motore HL7 per lo scambio messaggi, ma di un **sistema di archiviazione dati clinici** organizzato per categorie con schema di validazione.

I dati sono gestiti tramite il [sistema Extra Data](/anagrafica/extra-data.md) e sono disponibili sia per gli assistiti dell'anagrafica che per i record MPI.

## Riferimenti Standard

Le categorie sono state progettate prendendo spunto da:

| Standard | Documento | Utilizzo |
|----------|-----------|----------|
| **HL7 v2.5** | HL7 per APC v6.1 (Data Processing) | Struttura segmenti PID, NK1, PV1, ROL, OBX |
| **FHIR R4** | HL7 FHIR Patient, AllergyIntolerance, Condition, etc. | Naming e struttura risorse |
| **SIAD v7.4** | Ministero della Salute - Assistenza Domiciliare | Valutazione sanitaria/sociale |

## Categorie HL7 Disponibili

| Categoria | Segmento HL7 | Risorsa FHIR | Tipo |
|-----------|-------------|--------------|------|
| `HL7_CONTATTI_EMERGENZA` | NK1 (NF) | Patient.contact | Campi singoli |
| `HL7_ALLERGIE` | OBX | AllergyIntolerance | JSON lista |
| `HL7_PATOLOGIE_CRONICHE` | — | Condition | JSON lista |
| `HL7_ESENZIONI` | PV1-20 | Coverage | JSON lista |
| `HL7_TERAPIE_CRONICHE` | — | MedicationRequest | JSON lista |
| `HL7_PARAMETRI_VITALI` | OBX | Observation (vital-signs) | Campi singoli |
| `HL7_CONSENSI` | NK1 (CONFC) | Consent | JSON lista |
| `HL7_ANAGRAFICA_EXTRA` | PID-16, NK1 (PR) | — | Campi singoli |

## Dati HL7 nel Modello Assistiti

Alcuni dati HL7 sono gia presenti come **campi diretti** nel modello `Anagrafica_Assistiti`:

| Dato HL7 | Segmento | Campo nel modello |
|----------|----------|-------------------|
| Cognome/Nome | PID-5 | `cognome`, `nome` |
| Sesso | PID-8 | `sesso` |
| Data nascita | PID-7 | `dataNascita` |
| Codice fiscale | PID-3 (NNITA) | `cf` |
| Indirizzo | PID-11 | `indirizzoResidenza`, `capResidenza`, ... |
| Data decesso | PID-29 | `dataDecesso` |
| Medico base | PV1-7, ROL | `ssnMMG*` |
| Esenzioni | PV1-20 | categoria `HL7_ESENZIONI` |
| Tessera sanitaria | PID-3 (SS) | `ssnNumeroTessera` |
| Tipo assistito | PV1-18 | `ssnTipoAssistito` |

I dati **non presenti** nel modello base sono gestiti tramite extra data (categorie HL7).

## Scope

| Scope | Accesso |
|-------|---------|
| `anagrafica-hl7_{categoria}-read` | Lettura singola categoria |
| `anagrafica-hl7_{categoria}-write` | Scrittura singola categoria |
| `anagrafica-hl7_*-read` | Lettura **tutte** le categorie HL7 |
| `anagrafica-hl7_*-write` | Scrittura **tutte** le categorie HL7 |
