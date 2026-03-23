# Migrazioni SQL

Le migrazioni vengono eseguite automaticamente all'avvio dell'applicazione (`sails lift`).

## Convenzioni

### Nome file
```
YYYYMMDD_NNN_descrizione.sql
```
Esempio: `20260323_001_extra_data.sql`

Il prefisso con data e numero progressivo garantisce l'ordine di esecuzione.

### Header obbligatorio
Ogni file deve contenere il commento che indica il database target:
```sql
-- database: anagrafica
```

Database disponibili: `anagrafica`, `auth`, `log`

### Tracciamento
Le migrazioni eseguite vengono registrate nella tabella `_migrations` di ogni database.
Una migrazione non viene mai ri-eseguita.

### Errori
Se una migrazione fallisce, viene loggato l'errore ma le altre migrazioni continuano.
La migrazione fallita non viene registrata come eseguita, quindi verrà ritentata al prossimo avvio.
