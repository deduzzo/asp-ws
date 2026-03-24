-- database: auth
-- Aggiunge campo otp_required alla tabella utenti

ALTER TABLE utenti ADD COLUMN otp_required TINYINT(1) NOT NULL DEFAULT 0 AFTER otp_type;
