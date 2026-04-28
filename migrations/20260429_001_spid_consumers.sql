-- database: auth
-- Tabella spid_consumers: whitelist dinamica delle redirect_uri ammesse per il
-- flow SPID/CIE server-side. Sostituisce il campo allowedRedirectUris di
-- private_spid_login.json (rimosso in modo da poter gestire le app consumer
-- direttamente dal pannello admin senza editare file sul server).

CREATE TABLE IF NOT EXISTS spid_consumers (
  id INT NOT NULL AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  redirect_uri VARCHAR(500) NOT NULL,
  ambito INT NULL,
  attivo TINYINT(1) NOT NULL DEFAULT 1,
  note VARCHAR(500) NULL,
  createdAt BIGINT UNSIGNED NULL,
  updatedAt BIGINT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_redirect_uri (redirect_uri),
  KEY idx_ambito (ambito),
  CONSTRAINT fk_spid_consumers_ambito FOREIGN KEY (ambito) REFERENCES ambiti(id)
);

-- Seed: whitelist dell'endpoint di debug gia' usato in dev.
-- Idempotente: WHERE NOT EXISTS impedisce il doppio insert se la migration viene rieseguita.
INSERT INTO spid_consumers (nome, redirect_uri, ambito, attivo, note, createdAt, updatedAt)
SELECT 'SPID Debug Endpoint',
       'https://ws1.asp.messina.it/api/v1/login/spid/debug',
       (SELECT id FROM ambiti WHERE ambito = 'api' LIMIT 1),
       1,
       'Endpoint interno di debug per il flow SPID/CIE. Disattivare in produzione.',
       UNIX_TIMESTAMP() * 1000,
       UNIX_TIMESTAMP() * 1000
WHERE NOT EXISTS (
  SELECT 1 FROM spid_consumers WHERE redirect_uri = 'https://ws1.asp.messina.it/api/v1/login/spid/debug'
);
