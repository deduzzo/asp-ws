-- migration: Storico modifiche record MPI
-- database: anagrafica

CREATE TABLE mpi_record_storico (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mpiRecord INT NOT NULL,
  operazione ENUM('CREATE','UPDATE','LINK','UNLINK','ANNULLA') NOT NULL,
  dettaglio JSON,
  utente VARCHAR(100) NOT NULL,
  ipAddress VARCHAR(45),
  createdAt BIGINT,
  updatedAt BIGINT,
  INDEX idx_mpi_storico_record (mpiRecord),
  INDEX idx_mpi_storico_createdAt (createdAt),
  FOREIGN KEY (mpiRecord) REFERENCES mpi_record(id) ON DELETE CASCADE
);
