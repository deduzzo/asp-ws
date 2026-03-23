-- migration: Extra Data per Anagrafica con Categorie, Versioning e Scope
-- database: anagrafica

CREATE TABLE extra_data_categorie (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codice VARCHAR(50) NOT NULL UNIQUE,
  descrizione VARCHAR(255),
  scopoLettura VARCHAR(100) NOT NULL,
  scopoScrittura VARCHAR(100) NOT NULL,
  campi JSON NOT NULL,
  attivo TINYINT(1) DEFAULT 1,
  createdAt BIGINT,
  updatedAt BIGINT
);

CREATE TABLE extra_data_valori (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assistito INT NOT NULL,
  categoria INT NOT NULL,
  chiave VARCHAR(100) NOT NULL,
  valore TEXT,
  createdAt BIGINT,
  updatedAt BIGINT,
  UNIQUE KEY uq_assistito_cat_chiave (assistito, categoria, chiave),
  FOREIGN KEY (assistito) REFERENCES assistiti(id) ON DELETE CASCADE,
  FOREIGN KEY (categoria) REFERENCES extra_data_categorie(id) ON DELETE CASCADE
);

CREATE TABLE extra_data_storico (
  id INT AUTO_INCREMENT PRIMARY KEY,
  valore INT NOT NULL,
  vecchioValore TEXT,
  nuovoValore TEXT,
  operazione VARCHAR(10) NOT NULL,
  utente VARCHAR(100) NOT NULL,
  ipAddress VARCHAR(45),
  createdAt BIGINT,
  updatedAt BIGINT,
  FOREIGN KEY (valore) REFERENCES extra_data_valori(id) ON DELETE CASCADE
);

CREATE INDEX idx_valori_assistito ON extra_data_valori(assistito);
CREATE INDEX idx_valori_categoria ON extra_data_valori(categoria);
CREATE INDEX idx_storico_valore ON extra_data_storico(valore);
CREATE INDEX idx_storico_createdAt ON extra_data_storico(createdAt);
