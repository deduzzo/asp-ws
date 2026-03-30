-- migration: Scope per categorie SIAD e HL7_ANAGRAFICA_EXTRA
-- database: auth

-- ============================================
-- Scope SIAD_PRESA_IN_CARICO
-- ============================================
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-siad_presa_in_carico-read', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-siad_presa_in_carico-read');
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-siad_presa_in_carico-write', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-siad_presa_in_carico-write');

-- ============================================
-- Scope SIAD_VALUTAZIONE_SANITARIA
-- ============================================
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-siad_valutazione_sanitaria-read', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-siad_valutazione_sanitaria-read');
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-siad_valutazione_sanitaria-write', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-siad_valutazione_sanitaria-write');

-- ============================================
-- Scope SIAD_VALUTAZIONE_SOCIALE
-- ============================================
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-siad_valutazione_sociale-read', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-siad_valutazione_sociale-read');
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-siad_valutazione_sociale-write', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-siad_valutazione_sociale-write');

-- ============================================
-- Scope HL7_ANAGRAFICA_EXTRA
-- ============================================
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-hl7_anagrafica_extra-read', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-hl7_anagrafica_extra-read');
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-hl7_anagrafica_extra-write', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-hl7_anagrafica_extra-write');

-- ============================================
-- Scope wildcard per tutte le categorie SIAD
-- ============================================
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-siad_*-read', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-siad_*-read');
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'anagrafica-siad_*-write', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'anagrafica-siad_*-write');
