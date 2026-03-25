-- migration: Extra data per record MPI (riusa extra_data_categorie)
-- database: anagrafica

CREATE TABLE mpi_extra_data_valori (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mpiRecord INT NOT NULL,
  categoria INT NOT NULL,
  chiave VARCHAR(100) NOT NULL,
  valore TEXT,
  createdAt BIGINT,
  updatedAt BIGINT,
  UNIQUE KEY uq_mpi_cat_chiave (mpiRecord, categoria, chiave),
  FOREIGN KEY (mpiRecord) REFERENCES mpi_record(id) ON DELETE CASCADE,
  FOREIGN KEY (categoria) REFERENCES extra_data_categorie(id) ON DELETE CASCADE
);

CREATE TABLE mpi_extra_data_storico (
  id INT AUTO_INCREMENT PRIMARY KEY,
  valore INT NOT NULL,
  vecchioValore TEXT,
  nuovoValore TEXT,
  operazione VARCHAR(10) NOT NULL,
  utente VARCHAR(100) NOT NULL,
  ipAddress VARCHAR(45),
  createdAt BIGINT,
  updatedAt BIGINT,
  FOREIGN KEY (valore) REFERENCES mpi_extra_data_valori(id) ON DELETE CASCADE
);

CREATE INDEX idx_mpi_ed_record ON mpi_extra_data_valori(mpiRecord);
CREATE INDEX idx_mpi_ed_categoria ON mpi_extra_data_valori(categoria);
CREATE INDEX idx_mpi_ed_storico_valore ON mpi_extra_data_storico(valore);
CREATE INDEX idx_mpi_ed_storico_createdAt ON mpi_extra_data_storico(createdAt);
