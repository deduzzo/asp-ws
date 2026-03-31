-- migration: Rinomina scope extra data nel DB auth (naming gerarchico)
-- database: auth

-- ===== 1. RINOMINA SCOPE SINGOLI =====

-- CONTATTI / EXTRA (categorie pre-esistenti)
UPDATE scopi SET scopo = 'anagrafica_contatti-read' WHERE scopo = 'anagrafica-contatti-read';
UPDATE scopi SET scopo = 'anagrafica_contatti-write' WHERE scopo = 'anagrafica-contatti-write';
UPDATE scopi SET scopo = 'anagrafica_note-read' WHERE scopo = 'anagrafica-extra-read';
UPDATE scopi SET scopo = 'anagrafica_note-write' WHERE scopo = 'anagrafica-extra-write';

-- HL7 -> ANAGRAFICA
UPDATE scopi SET scopo = 'anagrafica_extra-read' WHERE scopo = 'anagrafica-hl7_anagrafica_extra-read';
UPDATE scopi SET scopo = 'anagrafica_extra-write' WHERE scopo = 'anagrafica-hl7_anagrafica_extra-write';
UPDATE scopi SET scopo = 'anagrafica_contatti_emergenza-read' WHERE scopo = 'anagrafica-hl7_contatti_emergenza-read';
UPDATE scopi SET scopo = 'anagrafica_contatti_emergenza-write' WHERE scopo = 'anagrafica-hl7_contatti_emergenza-write';

-- HL7 -> CLINICO
UPDATE scopi SET scopo = 'clinico_allergie-read' WHERE scopo = 'anagrafica-hl7_allergie-read';
UPDATE scopi SET scopo = 'clinico_allergie-write' WHERE scopo = 'anagrafica-hl7_allergie-write';
UPDATE scopi SET scopo = 'clinico_patologie-read' WHERE scopo = 'anagrafica-hl7_patologie_croniche-read';
UPDATE scopi SET scopo = 'clinico_patologie-write' WHERE scopo = 'anagrafica-hl7_patologie_croniche-write';
UPDATE scopi SET scopo = 'clinico_terapie-read' WHERE scopo = 'anagrafica-hl7_terapie_croniche-read';
UPDATE scopi SET scopo = 'clinico_terapie-write' WHERE scopo = 'anagrafica-hl7_terapie_croniche-write';
UPDATE scopi SET scopo = 'clinico_parametri_vitali-read' WHERE scopo = 'anagrafica-hl7_parametri_vitali-read';
UPDATE scopi SET scopo = 'clinico_parametri_vitali-write' WHERE scopo = 'anagrafica-hl7_parametri_vitali-write';
UPDATE scopi SET scopo = 'clinico_consensi-read' WHERE scopo = 'anagrafica-hl7_consensi-read';
UPDATE scopi SET scopo = 'clinico_consensi-write' WHERE scopo = 'anagrafica-hl7_consensi-write';
UPDATE scopi SET scopo = 'clinico_esenzioni-read' WHERE scopo = 'anagrafica-hl7_esenzioni-read';
UPDATE scopi SET scopo = 'clinico_esenzioni-write' WHERE scopo = 'anagrafica-hl7_esenzioni-write';

-- SIAD -> CLINICO
UPDATE scopi SET scopo = 'clinico_presa_in_carico-read' WHERE scopo = 'anagrafica-siad_presa_in_carico-read';
UPDATE scopi SET scopo = 'clinico_presa_in_carico-write' WHERE scopo = 'anagrafica-siad_presa_in_carico-write';
UPDATE scopi SET scopo = 'clinico_valutazione_sanitaria-read' WHERE scopo = 'anagrafica-siad_valutazione_sanitaria-read';
UPDATE scopi SET scopo = 'clinico_valutazione_sanitaria-write' WHERE scopo = 'anagrafica-siad_valutazione_sanitaria-write';
UPDATE scopi SET scopo = 'clinico_valutazione_sociale-read' WHERE scopo = 'anagrafica-siad_valutazione_sociale-read';
UPDATE scopi SET scopo = 'clinico_valutazione_sociale-write' WHERE scopo = 'anagrafica-siad_valutazione_sociale-write';

-- ===== 2. RINOMINA SCOPE WILDCARD VECCHI =====

-- hl7_* e siad_* diventano clinico_* (evita duplicati: DELETE poi INSERT)
DELETE FROM scopi WHERE scopo IN ('anagrafica-siad_*-read', 'anagrafica-siad_*-write');
UPDATE scopi SET scopo = 'clinico_*-read' WHERE scopo = 'anagrafica-hl7_*-read';
UPDATE scopi SET scopo = 'clinico_*-write' WHERE scopo = 'anagrafica-hl7_*-write';

-- anagrafica-*-read/write generico non serve piu (era troppo ampio col vecchio schema)
DELETE FROM scopi WHERE scopo IN ('anagrafica-*-read', 'anagrafica-*-write');

-- ===== 3. CREA NUOVI SCOPE WILDCARD =====

-- Wildcard per macro-gruppo anagrafica
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica_*-read', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica_*-read');
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica_*-write', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica_*-write');

-- Wildcard globale (tutto extra data)
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT '*-read', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = '*-read');
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT '*-write', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = '*-write');
