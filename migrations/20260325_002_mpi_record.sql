-- migration: Record MPI (Master Patient Index)
-- database: anagrafica

CREATE TABLE mpi_record (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mpiId CHAR(36) NOT NULL UNIQUE,
  applicazione INT NOT NULL,
  idEsterno VARCHAR(255),
  stato ENUM('aperto','identificato','annullato') NOT NULL DEFAULT 'aperto',
  assistito INT,
  dataIdentificazione BIGINT,
  utenteIdentificazione VARCHAR(100),

  cf VARCHAR(20),
  cognome VARCHAR(255),
  nome VARCHAR(255),
  sesso VARCHAR(5),
  dataNascita BIGINT,
  comuneNascita VARCHAR(255),
  codComuneNascita VARCHAR(20),
  codIstatComuneNascita VARCHAR(20),
  provinciaNascita VARCHAR(5),
  indirizzoResidenza VARCHAR(255),
  capResidenza VARCHAR(10),
  comuneResidenza VARCHAR(255),
  codComuneResidenza VARCHAR(20),
  codIstatComuneResidenza VARCHAR(20),
  asp VARCHAR(10),
  ssnTipoAssistito VARCHAR(50),
  ssnInizioAssistenza BIGINT,
  ssnFineAssistenza BIGINT,
  ssnMotivazioneFineAssistenza VARCHAR(255),
  ssnNumeroTessera VARCHAR(50),
  dataDecesso BIGINT,

  note TEXT,
  createdAt BIGINT,
  updatedAt BIGINT,

  INDEX idx_mpi_applicazione (applicazione),
  INDEX idx_mpi_assistito (assistito),
  INDEX idx_mpi_stato (stato),
  INDEX idx_mpi_cf (cf),
  INDEX idx_mpi_idEsterno (idEsterno),
  INDEX idx_mpi_cognome_nome (cognome, nome),
  FOREIGN KEY (applicazione) REFERENCES mpi_applicazioni(id),
  FOREIGN KEY (assistito) REFERENCES assistiti(id) ON DELETE SET NULL
);
