-- migration: Aggiunge campo codice breve univoco ai record MPI
-- database: anagrafica

ALTER TABLE mpi_record ADD COLUMN codice VARCHAR(10) UNIQUE AFTER mpiId;
CREATE INDEX idx_mpi_codice ON mpi_record(codice);

-- Genera codici per record esistenti
UPDATE mpi_record SET codice = UPPER(SUBSTRING(MD5(CONCAT(id, mpiId, RAND())), 1, 8)) WHERE codice IS NULL;
