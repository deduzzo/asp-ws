# Categorie HL7 - Dettaglio

## ANAGRAFICA_CONTATTI_EMERGENZA

Contatti di emergenza del paziente.

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|:---:|-------------|
| `nome_cognome` | string | Si | Nome e cognome del contatto |
| `relazione` | string | Si | Relazione (genitore, coniuge, figlio, altro) |
| `telefono` | string | Si | Numero di telefono |
| `note` | string | No | Note aggiuntive |

---

## CLINICO_ALLERGIE

Lista allergie e intolleranze in formato JSON.

**Campo unico:** `lista` (tipo `json`)

Struttura di ogni elemento:

| Campo | Descrizione |
|-------|-------------|
| `sostanza` | Nome della sostanza allergenica |
| `tipo` | farmaco, alimento, ambientale, altro |
| `categoria` | food, medication, environment, biologic |
| `criticita` | bassa, media, alta |
| `reazione` | Descrizione reazione |
| `severita` | lieve, moderata, grave |
| `data_insorgenza` | Data prima manifestazione |
| `stato` | attiva, inattiva, risolta |
| `note` | Note aggiuntive |

---

## CLINICO_PATOLOGIE

Lista patologie croniche e diagnosi.

**Campo unico:** `lista` (tipo `json`)

| Campo | Descrizione |
|-------|-------------|
| `codice_icd9` | Codice ICD-9 |
| `codice_icd10` | Codice ICD-10 |
| `descrizione` | Descrizione patologia |
| `stato_clinico` | attiva, remissione, risolta |
| `data_insorgenza` | Data insorgenza |
| `data_risoluzione` | Data risoluzione |
| `severita` | lieve, moderata, grave |
| `note` | Note |

---

## CLINICO_ESENZIONI

Lista esenzioni SSN.

**Campo unico:** `lista` (tipo `json`)

| Campo | Descrizione |
|-------|-------------|
| `codice_esenzione` | Codice esenzione |
| `descrizione` | Descrizione |
| `tipo` | patologia, reddito, invalidita, gravidanza, eta |
| `data_inizio` | Data inizio validita |
| `data_fine` | Data fine validita |
| `asl_rilascio` | ASL che ha rilasciato |

---

## CLINICO_TERAPIE

Lista terapie farmacologiche croniche.

**Campo unico:** `lista` (tipo `json`)

| Campo | Descrizione |
|-------|-------------|
| `farmaco` | Nome farmaco |
| `codice_aic` | Codice AIC |
| `dosaggio` | Dosaggio |
| `frequenza` | Frequenza somministrazione |
| `via_somministrazione` | Via di somministrazione |
| `data_inizio` | Data inizio terapia |
| `prescrittore` | Medico prescrittore |
| `note` | Note |

---

## CLINICO_PARAMETRI_VITALI

Ultimi parametri vitali rilevati.

| Campo | Tipo | Obbligatorio | Descrizione | LOINC |
|-------|------|:---:|-------------|-------|
| `pressione_sistolica` | number | No | mmHg | 8480-6 |
| `pressione_diastolica` | number | No | mmHg | 8462-4 |
| `frequenza_cardiaca` | number | No | bpm | 8867-4 |
| `peso_kg` | number | No | kg | 29463-7 |
| `altezza_cm` | number | No | cm | 8302-2 |
| `bmi` | number | No | kg/m2 | 39156-5 |
| `glicemia` | number | No | mg/dL | 2339-0 |
| `saturazione_o2` | number | No | % | 2708-6 |
| `temperatura` | number | No | Celsius | 8310-5 |
| `data_rilevazione` | date | No | Data rilevazione | — |
| `note` | string | No | Note | — |

---

## CLINICO_CONSENSI

Lista consensi informati.

**Campo unico:** `lista` (tipo `json`)

| Campo | Descrizione |
|-------|-------------|
| `tipo_consenso` | trattamento_dati, fse, telemedicina, ricerca, vaccinazioni |
| `stato` | active, rejected, inactive |
| `data_rilascio` | Data rilascio consenso |
| `data_revoca` | Data revoca (se revocato) |
| `modalita` | Modalita di rilascio |
| `note` | Note |
