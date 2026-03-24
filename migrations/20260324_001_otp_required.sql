-- database: auth
-- Aggiunge campo otp_required alla tabella utenti

ALTER TABLE utenti ADD COLUMN IF NOT EXISTS otp_required TINYINT(1) NOT NULL DEFAULT 0 AFTER otp_type;
