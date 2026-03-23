-- migration: Scope per categorie HL7 + scope wildcard
-- database: auth

-- Scope specifici per categoria
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-hl7_contatti_emergenza-read', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-hl7_contatti_emergenza-read');
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-hl7_contatti_emergenza-write', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-hl7_contatti_emergenza-write');

INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-hl7_allergie-read', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-hl7_allergie-read');
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-hl7_allergie-write', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-hl7_allergie-write');

INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-hl7_patologie_croniche-read', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-hl7_patologie_croniche-read');
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-hl7_patologie_croniche-write', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-hl7_patologie_croniche-write');

INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-hl7_esenzioni-read', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-hl7_esenzioni-read');
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-hl7_esenzioni-write', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-hl7_esenzioni-write');

INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-hl7_terapie_croniche-read', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-hl7_terapie_croniche-read');
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-hl7_terapie_croniche-write', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-hl7_terapie_croniche-write');

INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-hl7_parametri_vitali-read', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-hl7_parametri_vitali-read');
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-hl7_parametri_vitali-write', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-hl7_parametri_vitali-write');

INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-hl7_consensi-read', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-hl7_consensi-read');
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-hl7_consensi-write', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-hl7_consensi-write');

-- Scope wildcard per accesso a tutte le categorie HL7
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-hl7_*-read', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-hl7_*-read');
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-hl7_*-write', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-hl7_*-write');

-- Scope wildcard per accesso a TUTTE le categorie extra data
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-*-read', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-*-read');
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-*-write', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-*-write');
