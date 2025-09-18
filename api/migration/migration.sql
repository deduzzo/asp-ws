ALTER TABLE `utenti`
  ADD COLUMN `allow_domain_login` TINYINT(1) NOT NULL DEFAULT 0 AFTER `username`,
  ADD COLUMN `domain` VARCHAR(200) NULL AFTER `allow_domain_login`,
  ADD COLUMN `mail` VARCHAR(200) NULL AFTER `domain`,
  ADD COLUMN `otp_enabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `token_revocato`,
  ADD COLUMN `otp_key` VARCHAR(200) NULL AFTER `otp_enabled`,
  ADD COLUMN `otp` VARCHAR(100) NULL AFTER `otp_key`,
  ADD COLUMN `otp_exp` DOUBLE NULL AFTER `otp`,
  ADD COLUMN `otp_type` VARCHAR(10) NULL AFTER `otp_exp`;
