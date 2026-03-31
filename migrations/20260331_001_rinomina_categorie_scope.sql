-- migration: Rinomina categorie extra data con naming gerarchico per tipologia
-- database: anagrafica

-- ===== 1. RINOMINA CODICI CATEGORIE =====

-- Anagrafiche
UPDATE extra_data_categorie SET codice = 'ANAGRAFICA_CONTATTI' WHERE codice = 'CONTATTI';
UPDATE extra_data_categorie SET codice = 'ANAGRAFICA_NOTE' WHERE codice = 'EXTRA';
UPDATE extra_data_categorie SET codice = 'ANAGRAFICA_EXTRA' WHERE codice = 'HL7_ANAGRAFICA_EXTRA';
UPDATE extra_data_categorie SET codice = 'ANAGRAFICA_CONTATTI_EMERGENZA' WHERE codice = 'HL7_CONTATTI_EMERGENZA';

-- Cliniche
UPDATE extra_data_categorie SET codice = 'CLINICO_ALLERGIE' WHERE codice = 'HL7_ALLERGIE';
UPDATE extra_data_categorie SET codice = 'CLINICO_PATOLOGIE' WHERE codice = 'HL7_PATOLOGIE_CRONICHE';
UPDATE extra_data_categorie SET codice = 'CLINICO_TERAPIE' WHERE codice = 'HL7_TERAPIE_CRONICHE';
UPDATE extra_data_categorie SET codice = 'CLINICO_PARAMETRI_VITALI' WHERE codice = 'HL7_PARAMETRI_VITALI';
UPDATE extra_data_categorie SET codice = 'CLINICO_CONSENSI' WHERE codice = 'HL7_CONSENSI';
UPDATE extra_data_categorie SET codice = 'CLINICO_ESENZIONI' WHERE codice = 'HL7_ESENZIONI';
UPDATE extra_data_categorie SET codice = 'CLINICO_PRESA_IN_CARICO' WHERE codice = 'SIAD_PRESA_IN_CARICO';
UPDATE extra_data_categorie SET codice = 'CLINICO_VALUTAZIONE_SANITARIA' WHERE codice = 'SIAD_VALUTAZIONE_SANITARIA';
UPDATE extra_data_categorie SET codice = 'CLINICO_VALUTAZIONE_SOCIALE' WHERE codice = 'SIAD_VALUTAZIONE_SOCIALE';

-- ===== 2. AGGIORNA scopoLettura / scopoScrittura =====

UPDATE extra_data_categorie SET scopoLettura = 'anagrafica_contatti-read', scopoScrittura = 'anagrafica_contatti-write' WHERE codice = 'ANAGRAFICA_CONTATTI';
UPDATE extra_data_categorie SET scopoLettura = 'anagrafica_note-read', scopoScrittura = 'anagrafica_note-write' WHERE codice = 'ANAGRAFICA_NOTE';
UPDATE extra_data_categorie SET scopoLettura = 'anagrafica_extra-read', scopoScrittura = 'anagrafica_extra-write' WHERE codice = 'ANAGRAFICA_EXTRA';
UPDATE extra_data_categorie SET scopoLettura = 'anagrafica_contatti_emergenza-read', scopoScrittura = 'anagrafica_contatti_emergenza-write' WHERE codice = 'ANAGRAFICA_CONTATTI_EMERGENZA';
UPDATE extra_data_categorie SET scopoLettura = 'clinico_allergie-read', scopoScrittura = 'clinico_allergie-write' WHERE codice = 'CLINICO_ALLERGIE';
UPDATE extra_data_categorie SET scopoLettura = 'clinico_patologie-read', scopoScrittura = 'clinico_patologie-write' WHERE codice = 'CLINICO_PATOLOGIE';
UPDATE extra_data_categorie SET scopoLettura = 'clinico_terapie-read', scopoScrittura = 'clinico_terapie-write' WHERE codice = 'CLINICO_TERAPIE';
UPDATE extra_data_categorie SET scopoLettura = 'clinico_parametri_vitali-read', scopoScrittura = 'clinico_parametri_vitali-write' WHERE codice = 'CLINICO_PARAMETRI_VITALI';
UPDATE extra_data_categorie SET scopoLettura = 'clinico_consensi-read', scopoScrittura = 'clinico_consensi-write' WHERE codice = 'CLINICO_CONSENSI';
UPDATE extra_data_categorie SET scopoLettura = 'clinico_esenzioni-read', scopoScrittura = 'clinico_esenzioni-write' WHERE codice = 'CLINICO_ESENZIONI';
UPDATE extra_data_categorie SET scopoLettura = 'clinico_presa_in_carico-read', scopoScrittura = 'clinico_presa_in_carico-write' WHERE codice = 'CLINICO_PRESA_IN_CARICO';
UPDATE extra_data_categorie SET scopoLettura = 'clinico_valutazione_sanitaria-read', scopoScrittura = 'clinico_valutazione_sanitaria-write' WHERE codice = 'CLINICO_VALUTAZIONE_SANITARIA';
UPDATE extra_data_categorie SET scopoLettura = 'clinico_valutazione_sociale-read', scopoScrittura = 'clinico_valutazione_sociale-write' WHERE codice = 'CLINICO_VALUTAZIONE_SOCIALE';

-- ===== 3. AGGIORNA CAMPI CONTATTI (nuova struttura) =====

UPDATE extra_data_categorie SET
  descrizione = 'Recapiti del paziente (telefoni, email, PEC)',
  campi = '[{"chiave":"cellulare_privato","tipo":"string","obbligatorio":false,"etichetta":"Cellulare privato","note":"Numero di cellulare personale","esempio":"3331234567"},{"chiave":"cellulare_pubblico","tipo":"string","obbligatorio":false,"etichetta":"Cellulare pubblico","note":"Numero di cellulare pubblico/lavoro","esempio":"3409876543"},{"chiave":"cellulare_altro","tipo":"string","obbligatorio":false,"etichetta":"Cellulare altro","note":"Altro recapito cellulare","esempio":"3281112233"},{"chiave":"email","tipo":"string","obbligatorio":false,"etichetta":"Email","note":"Indirizzo email personale","esempio":"mario.rossi@email.it"},{"chiave":"fisso_privato","tipo":"string","obbligatorio":false,"etichetta":"Fisso privato","note":"Telefono fisso abitazione","esempio":"0901234567"},{"chiave":"fisso_pubblico","tipo":"string","obbligatorio":false,"etichetta":"Fisso pubblico","note":"Telefono fisso lavoro/ufficio","esempio":"0907654321"},{"chiave":"fisso_altro","tipo":"string","obbligatorio":false,"etichetta":"Fisso altro","note":"Altro recapito fisso","esempio":"0909998877"},{"chiave":"pec","tipo":"string","obbligatorio":false,"etichetta":"PEC","note":"Posta Elettronica Certificata","esempio":"mario.rossi@pec.it"}]'
WHERE codice = 'ANAGRAFICA_CONTATTI';
