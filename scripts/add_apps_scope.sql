-- Add 'apps' scope for Docker apps management
-- Run this script on the 'auth' database

INSERT INTO scopi (scopo, attivo, createdAt, updatedAt)
SELECT 'apps', 1, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM scopi WHERE scopo = 'apps'
);

-- Display the result
SELECT * FROM scopi WHERE scopo = 'apps';
