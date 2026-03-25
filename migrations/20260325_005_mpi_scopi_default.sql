-- migration: Scopi MPI di default
-- database: auth

INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'mpi-search', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'mpi-search');
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'mpi-link', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'mpi-link');
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'mpi-admin', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'mpi-admin');

-- Scope wildcard per accesso a tutti i record MPI di tutte le app
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'mpi-*-read', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'mpi-*-read');
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt) SELECT 'mpi-*-write', 1, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000 WHERE NOT EXISTS (SELECT 1 FROM scopi WHERE scopo = 'mpi-*-write');
