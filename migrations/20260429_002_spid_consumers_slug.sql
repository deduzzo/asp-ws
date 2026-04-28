-- database: auth
-- Aggiunge la colonna "slug" a spid_consumers: identificatore stabile e
-- leggibile usato dalle app integranti come parametro consumer=<slug> nel
-- flow SPID/CIE (sostituisce il pesante &redirect_uri=... in querystring).
-- Migration idempotente: rieseguibile senza errori.

-- 1) Aggiungi colonna slug se non esiste
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'spid_consumers' AND column_name = 'slug'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE spid_consumers ADD COLUMN slug VARCHAR(50) NULL AFTER nome',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) Backfill seed conosciuto
UPDATE spid_consumers
SET slug = 'spid-debug'
WHERE redirect_uri = 'https://ws1.asp.messina.it/api/v1/login/spid/debug' AND slug IS NULL;

-- 3) Backfill eventuali altre righe con uno slug derivato dall'id
UPDATE spid_consumers
SET slug = CONCAT('consumer-', id)
WHERE slug IS NULL;

-- 4) NOT NULL
ALTER TABLE spid_consumers MODIFY COLUMN slug VARCHAR(50) NOT NULL;

-- 5) UNIQUE INDEX se non esiste
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'spid_consumers' AND index_name = 'uniq_slug'
);
SET @sql := IF(@idx_exists = 0,
  'ALTER TABLE spid_consumers ADD UNIQUE KEY uniq_slug (slug)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
