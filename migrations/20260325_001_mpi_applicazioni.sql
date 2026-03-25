-- migration: Registro applicazioni MPI
-- database: anagrafica

CREATE TABLE mpi_applicazioni (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codice VARCHAR(50) NOT NULL UNIQUE,
  nome VARCHAR(255) NOT NULL,
  descrizione TEXT,
  versione VARCHAR(20),
  contatto VARCHAR(255),
  attivo TINYINT(1) DEFAULT 1,
  createdAt BIGINT,
  updatedAt BIGINT
);
