const fs = require('fs');
const path = require('path');

module.exports = {
  friendlyName: 'Run migrations',

  description: 'Esegue le migrazioni SQL pendenti dalla cartella migrations/. ' +
    'Ogni file deve avere il commento "-- database: <nome_datastore>" per indicare su quale database eseguire. ' +
    'Le migrazioni già eseguite vengono tracciate nella tabella _migrations di ogni database.',

  inputs: {},

  fn: async function (inputs, exits) {
    const migrationsDir = path.resolve(sails.config.appPath, 'migrations');

    // Verifica che la cartella esista
    if (!fs.existsSync(migrationsDir)) {
      sails.log.info('[Migrations] Cartella migrations/ non trovata, skip.');
      return exits.success({ executed: 0, skipped: 0 });
    }

    // Leggi i file .sql ordinati per nome (il timestamp nel nome garantisce l'ordine)
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      sails.log.info('[Migrations] Nessun file di migrazione trovato.');
      return exits.success({ executed: 0, skipped: 0 });
    }

    // Mappa dei datastore -> modello di riferimento per sendNativeQuery
    // Usiamo un modello qualsiasi di ogni datastore per ottenere la connessione
    const datastoreModels = {
      anagrafica: 'Anagrafica_Assistiti',
      auth: 'Auth_Utenti',
      log: 'Log'
    };

    let executed = 0;
    let skipped = 0;
    const errors = [];

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');

      // Estrai il database target dal commento
      const dbMatch = content.match(/^--\s*database:\s*(\w+)/mi);
      if (!dbMatch) {
        sails.log.warn(`[Migrations] File ${file}: commento "-- database: <nome>" mancante, skip.`);
        skipped++;
        continue;
      }

      const datastoreName = dbMatch[1].trim();
      const modelName = datastoreModels[datastoreName];

      if (!modelName) {
        sails.log.warn(`[Migrations] File ${file}: datastore "${datastoreName}" non riconosciuto. Datastores validi: ${Object.keys(datastoreModels).join(', ')}`);
        skipped++;
        continue;
      }

      const model = global[modelName];
      if (!model) {
        sails.log.warn(`[Migrations] File ${file}: modello ${modelName} non disponibile.`);
        skipped++;
        continue;
      }

      const datastore = model.getDatastore();

      try {
        // Assicurati che la tabella _migrations esista
        await datastore.sendNativeQuery(
          `CREATE TABLE IF NOT EXISTS _migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            filename VARCHAR(255) NOT NULL UNIQUE,
            executedAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )`
        );

        // Controlla se già eseguita
        const result = await datastore.sendNativeQuery(
          'SELECT id FROM _migrations WHERE filename = $1',
          [file]
        );

        if (result.rows.length > 0) {
          sails.log.verbose(`[Migrations] ${file} già eseguita, skip.`);
          skipped++;
          continue;
        }

        // Esegui le istruzioni SQL una per una
        // Rimuovi i commenti e splitta per ';'
        const statements = content
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.match(/^--.*$/));

        for (const statement of statements) {
          // Salta righe che sono solo commenti
          const cleanStatement = statement
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n')
            .trim();

          if (cleanStatement.length === 0) continue;

          await datastore.sendNativeQuery(cleanStatement);
        }

        // Registra la migrazione come eseguita
        await datastore.sendNativeQuery(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [file]
        );

        sails.log.info(`[Migrations] ✓ ${file} eseguita su ${datastoreName}`);
        executed++;

      } catch (err) {
        const errMsg = `[Migrations] ✗ Errore in ${file} su ${datastoreName}: ${err.message}`;
        sails.log.error(errMsg);
        errors.push({ file, error: err.message });
        // Non blocchiamo le altre migrazioni
      }
    }

    if (errors.length > 0) {
      sails.log.warn(`[Migrations] Completato con ${errors.length} errori.`);
    }

    sails.log.info(`[Migrations] Riepilogo: ${executed} eseguite, ${skipped} saltate, ${errors.length} errori.`);

    return exits.success({ executed, skipped, errors });
  }
};
