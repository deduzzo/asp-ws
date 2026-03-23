-- migration: Categorie HL7 di default per extra data
-- database: anagrafica

INSERT INTO extra_data_categorie (codice, descrizione, scopoLettura, scopoScrittura, campi, attivo, createdAt, updatedAt)
SELECT 'HL7_CONTATTI_EMERGENZA', 'Contatti di emergenza del paziente (FHIR Patient.contact)', 'anagrafica-hl7_contatti_emergenza-read', 'anagrafica-hl7_contatti_emergenza-write',
'[{"chiave":"nome_cognome","tipo":"string","obbligatorio":true,"etichetta":"Nome e Cognome"},{"chiave":"relazione","tipo":"string","obbligatorio":true,"etichetta":"Relazione (genitore, coniuge, figlio, altro)"},{"chiave":"telefono","tipo":"string","obbligatorio":true,"etichetta":"Telefono"},{"chiave":"note","tipo":"string","obbligatorio":false,"etichetta":"Note"}]',
1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000
WHERE NOT EXISTS (SELECT 1 FROM extra_data_categorie WHERE codice = 'HL7_CONTATTI_EMERGENZA');

INSERT INTO extra_data_categorie (codice, descrizione, scopoLettura, scopoScrittura, campi, attivo, createdAt, updatedAt)
SELECT 'HL7_ALLERGIE', 'Allergie e intolleranze (FHIR AllergyIntolerance)', 'anagrafica-hl7_allergie-read', 'anagrafica-hl7_allergie-write',
'[{"chiave":"lista","tipo":"json","obbligatorio":false,"etichetta":"Lista allergie [{sostanza, tipo, categoria, criticita, reazione, severita, data_insorgenza, stato, note}]"}]',
1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000
WHERE NOT EXISTS (SELECT 1 FROM extra_data_categorie WHERE codice = 'HL7_ALLERGIE');

INSERT INTO extra_data_categorie (codice, descrizione, scopoLettura, scopoScrittura, campi, attivo, createdAt, updatedAt)
SELECT 'HL7_PATOLOGIE_CRONICHE', 'Patologie croniche e diagnosi (FHIR Condition)', 'anagrafica-hl7_patologie_croniche-read', 'anagrafica-hl7_patologie_croniche-write',
'[{"chiave":"lista","tipo":"json","obbligatorio":false,"etichetta":"Lista patologie [{codice_icd9, codice_icd10, descrizione, stato_clinico, data_insorgenza, data_risoluzione, severita, note}]"}]',
1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000
WHERE NOT EXISTS (SELECT 1 FROM extra_data_categorie WHERE codice = 'HL7_PATOLOGIE_CRONICHE');

INSERT INTO extra_data_categorie (codice, descrizione, scopoLettura, scopoScrittura, campi, attivo, createdAt, updatedAt)
SELECT 'HL7_ESENZIONI', 'Esenzioni SSN (ticket, patologia, invalidita)', 'anagrafica-hl7_esenzioni-read', 'anagrafica-hl7_esenzioni-write',
'[{"chiave":"lista","tipo":"json","obbligatorio":false,"etichetta":"Lista esenzioni [{codice_esenzione, descrizione, tipo, data_inizio, data_fine, asl_rilascio}]"}]',
1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000
WHERE NOT EXISTS (SELECT 1 FROM extra_data_categorie WHERE codice = 'HL7_ESENZIONI');

INSERT INTO extra_data_categorie (codice, descrizione, scopoLettura, scopoScrittura, campi, attivo, createdAt, updatedAt)
SELECT 'HL7_TERAPIE_CRONICHE', 'Terapie farmacologiche croniche (FHIR MedicationRequest)', 'anagrafica-hl7_terapie_croniche-read', 'anagrafica-hl7_terapie_croniche-write',
'[{"chiave":"lista","tipo":"json","obbligatorio":false,"etichetta":"Lista terapie [{farmaco, codice_aic, dosaggio, frequenza, via_somministrazione, data_inizio, prescrittore, note}]"}]',
1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000
WHERE NOT EXISTS (SELECT 1 FROM extra_data_categorie WHERE codice = 'HL7_TERAPIE_CRONICHE');

INSERT INTO extra_data_categorie (codice, descrizione, scopoLettura, scopoScrittura, campi, attivo, createdAt, updatedAt)
SELECT 'HL7_PARAMETRI_VITALI', 'Ultimi parametri vitali rilevati (FHIR Observation vital-signs)', 'anagrafica-hl7_parametri_vitali-read', 'anagrafica-hl7_parametri_vitali-write',
'[{"chiave":"pressione_sistolica","tipo":"number","obbligatorio":false,"etichetta":"Pressione Sistolica (mmHg)"},{"chiave":"pressione_diastolica","tipo":"number","obbligatorio":false,"etichetta":"Pressione Diastolica (mmHg)"},{"chiave":"frequenza_cardiaca","tipo":"number","obbligatorio":false,"etichetta":"Frequenza Cardiaca (bpm)"},{"chiave":"peso_kg","tipo":"number","obbligatorio":false,"etichetta":"Peso (kg)"},{"chiave":"altezza_cm","tipo":"number","obbligatorio":false,"etichetta":"Altezza (cm)"},{"chiave":"bmi","tipo":"number","obbligatorio":false,"etichetta":"BMI"},{"chiave":"glicemia","tipo":"number","obbligatorio":false,"etichetta":"Glicemia (mg/dL)"},{"chiave":"saturazione_o2","tipo":"number","obbligatorio":false,"etichetta":"Saturazione O2 (%)"},{"chiave":"temperatura","tipo":"number","obbligatorio":false,"etichetta":"Temperatura (C)"},{"chiave":"data_rilevazione","tipo":"date","obbligatorio":false,"etichetta":"Data Rilevazione"},{"chiave":"note","tipo":"string","obbligatorio":false,"etichetta":"Note"}]',
1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000
WHERE NOT EXISTS (SELECT 1 FROM extra_data_categorie WHERE codice = 'HL7_PARAMETRI_VITALI');

INSERT INTO extra_data_categorie (codice, descrizione, scopoLettura, scopoScrittura, campi, attivo, createdAt, updatedAt)
SELECT 'HL7_CONSENSI', 'Consensi informati del paziente (FHIR Consent)', 'anagrafica-hl7_consensi-read', 'anagrafica-hl7_consensi-write',
'[{"chiave":"lista","tipo":"json","obbligatorio":false,"etichetta":"Lista consensi [{tipo_consenso, stato, data_rilascio, data_revoca, modalita, note}]"}]',
1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000
WHERE NOT EXISTS (SELECT 1 FROM extra_data_categorie WHERE codice = 'HL7_CONSENSI');
