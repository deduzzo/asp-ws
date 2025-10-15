module.exports = {


  friendlyName: 'Form database helper',


  description: 'Helper per gestire il database SQLite delle submissions dei form dinamici',


  inputs: {
    formId: {
      type: 'string',
      required: true,
      description: 'ID del form'
    },
    action: {
      type: 'string',
      required: true,
      description: 'Azione da eseguire: init, insert, getAll, getById, delete',
      isIn: ['init', 'insert', 'getAll', 'getById', 'delete', 'export']
    },
    data: {
      type: 'ref',
      description: 'Dati per insert o filtri per getAll'
    },
    submissionId: {
      type: 'number',
      description: 'ID submission per getById o delete'
    }
  },


  exits: {
    success: {
      description: 'Operazione completata con successo'
    },
    notFound: {
      description: 'Database o submission non trovato'
    },
    error: {
      description: 'Errore durante l\'operazione'
    }
  },


  fn: async function (inputs, exits) {
    const Database = require('better-sqlite3');
    const path = require('path');
    const fs = require('fs');

    const formsDir = path.join(__dirname, '../../api/data/forms');
    const templateDir = path.join(formsDir, 'template');
    const dataDir = path.join(formsDir, 'data');
    const dbPath = path.join(dataDir, `${inputs.formId}_data.db`);
    const formDefinitionPath = path.join(templateDir, `${inputs.formId}.json`);

    // Assicurati che la cartella data esista
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    try {
      // Verifica che il form esista
      if (!fs.existsSync(formDefinitionPath)) {
        return exits.notFound({ error: 'Form definition not found' });
      }

      // Leggi la definizione del form
      const formDefinition = JSON.parse(fs.readFileSync(formDefinitionPath, 'utf8'));

      // Apri/crea il database
      const db = new Database(dbPath);
      db.pragma('journal_mode = WAL'); // Better performance

      // === INIT: Crea la tabella se non esiste ===
      if (inputs.action === 'init' || !tableExists(db)) {
        createTable(db, formDefinition);
      }

      // === INSERT: Inserisce una nuova submission ===
      if (inputs.action === 'insert') {
        const result = insertSubmission(db, inputs.data, formDefinition);
        db.close();
        return exits.success({
          id: result.lastInsertRowid,
          createdAt: new Date().toISOString()
        });
      }

      // === GET ALL: Recupera tutte le submissions ===
      if (inputs.action === 'getAll') {
        const submissions = getAllSubmissions(db, inputs.data || {});
        db.close();
        return exits.success({ submissions, total: submissions.length });
      }

      // === GET BY ID: Recupera una submission specifica ===
      if (inputs.action === 'getById') {
        if (!inputs.submissionId) {
          db.close();
          return exits.error({ error: 'submissionId required' });
        }
        const submission = getSubmissionById(db, inputs.submissionId);
        db.close();
        if (!submission) {
          return exits.notFound({ error: 'Submission not found' });
        }
        return exits.success(submission);
      }

      // === DELETE: Elimina una submission ===
      if (inputs.action === 'delete') {
        if (!inputs.submissionId) {
          db.close();
          return exits.error({ error: 'submissionId required' });
        }
        const result = deleteSubmission(db, inputs.submissionId);
        db.close();
        if (result.changes === 0) {
          return exits.notFound({ error: 'Submission not found' });
        }
        return exits.success({ deleted: true });
      }

      // === EXPORT: Esporta i dati per Excel ===
      if (inputs.action === 'export') {
        const submissions = getAllSubmissions(db, inputs.data || {});
        const exportData = prepareExportData(submissions, formDefinition);
        db.close();
        return exits.success({ data: exportData, formDefinition });
      }

      db.close();
      return exits.success({ message: 'Operation completed' });

    } catch (err) {
      sails.log.error('FormDB Error:', err);
      return exits.error({ error: err.message });
    }

    // ========== HELPER FUNCTIONS ==========

    function tableExists(db) {
      const result = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='submissions'"
      ).get();
      return !!result;
    }

    function createTable(db, formDefinition) {
      // Crea tabella con colonne dinamiche basate sui campi del form
      let columns = [
        'id INTEGER PRIMARY KEY AUTOINCREMENT',
        'created_at TEXT NOT NULL DEFAULT (datetime(\'now\'))',
        'ip_address TEXT',
        'user_agent TEXT',
        'recaptcha_score REAL'
      ];

      // Aggiungi una colonna per ogni campo del form
      if (formDefinition.pages) {
        formDefinition.pages.forEach(page => {
          page.fields.forEach(field => {
            const columnType = getColumnType(field);
            columns.push(`field_${field.id} ${columnType}`);
          });
        });
      }

      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS submissions (
          ${columns.join(',\n          ')}
        )
      `;

      db.exec(createTableSQL);

      // Crea indici per performance
      db.exec('CREATE INDEX IF NOT EXISTS idx_created_at ON submissions(created_at)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_ip_address ON submissions(ip_address)');

      sails.log.info(`Table created for form: ${formDefinition.id}`);
    }

    function getColumnType(field) {
      // TEXT per la maggior parte dei campi (JSON per array)
      if (field.type === 'checkbox' || field.type === 'checkbox-multiple') {
        return 'TEXT'; // Salviamo array come JSON string
      }
      return 'TEXT';
    }

    function insertSubmission(db, data, formDefinition) {
      const { formValues, metadata = {} } = data;

      let columns = ['created_at', 'ip_address', 'user_agent', 'recaptcha_score'];
      let placeholders = ['datetime(\'now\')', '?', '?', '?'];
      let values = [
        metadata.ipAddress || null,
        metadata.userAgent || null,
        metadata.recaptchaScore || null
      ];

      // Aggiungi i valori dei campi
      if (formDefinition.pages) {
        formDefinition.pages.forEach(page => {
          page.fields.forEach(field => {
            columns.push(`field_${field.id}`);
            placeholders.push('?');

            let value = formValues[field.id];

            // Converti array in JSON string
            if (Array.isArray(value)) {
              value = JSON.stringify(value);
            }

            values.push(value || null);
          });
        });
      }

      const insertSQL = `
        INSERT INTO submissions (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
      `;

      const stmt = db.prepare(insertSQL);
      return stmt.run(...values);
    }

    function getAllSubmissions(db, filters = {}) {
      let query = 'SELECT * FROM submissions';
      let conditions = [];
      let params = [];

      // Filtri opzionali
      if (filters.startDate) {
        conditions.push('created_at >= ?');
        params.push(filters.startDate);
      }
      if (filters.endDate) {
        conditions.push('created_at <= ?');
        params.push(filters.endDate);
      }
      if (filters.ipAddress) {
        conditions.push('ip_address = ?');
        params.push(filters.ipAddress);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC';

      // Paginazione
      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
        if (filters.offset) {
          query += ' OFFSET ?';
          params.push(filters.offset);
        }
      }

      const stmt = db.prepare(query);
      const rows = stmt.all(...params);

      // Parse JSON fields
      return rows.map(row => parseSubmissionRow(row));
    }

    function getSubmissionById(db, id) {
      const stmt = db.prepare('SELECT * FROM submissions WHERE id = ?');
      const row = stmt.get(id);
      return row ? parseSubmissionRow(row) : null;
    }

    function deleteSubmission(db, id) {
      const stmt = db.prepare('DELETE FROM submissions WHERE id = ?');
      return stmt.run(id);
    }

    function parseSubmissionRow(row) {
      const parsed = { ...row };

      // Parse JSON fields (array values)
      Object.keys(parsed).forEach(key => {
        if (key.startsWith('field_') && parsed[key]) {
          try {
            // Prova a parsare come JSON
            const parsed_value = JSON.parse(parsed[key]);
            if (Array.isArray(parsed_value)) {
              parsed[key] = parsed_value;
            }
          } catch (e) {
            // Non è JSON, lascia come stringa
          }
        }
      });

      return parsed;
    }

    function prepareExportData(submissions, formDefinition) {
      // Prepara i dati in formato tabellare per Excel
      const headers = ['ID', 'Data Invio', 'IP Address'];

      // Aggiungi intestazioni per ogni campo
      const fieldMap = {};
      if (formDefinition.pages) {
        formDefinition.pages.forEach(page => {
          page.fields.forEach(field => {
            headers.push(field.label);
            fieldMap[`field_${field.id}`] = field;
          });
        });
      }

      const rows = submissions.map(sub => {
        const row = [
          sub.id,
          sub.created_at,
          sub.ip_address || ''
        ];

        // Aggiungi valori dei campi
        Object.keys(fieldMap).forEach(fieldKey => {
          let value = sub[fieldKey];

          // Converti array in stringa leggibile
          if (Array.isArray(value)) {
            const field = fieldMap[fieldKey];
            if (field.options) {
              // Sostituisci i valori con le label
              value = value.map(v => {
                const opt = field.options.find(o => o.value === v);
                return opt ? opt.label : v;
              }).join(', ');
            } else {
              value = value.join(', ');
            }
          }

          // Converti select value in label
          if (value && !Array.isArray(value)) {
            const field = fieldMap[fieldKey];
            if (field.type === 'select' && field.options) {
              const opt = field.options.find(o => o.value === value);
              if (opt) {
                value = opt.label;
              }
            }
          }

          row.push(value || '');
        });

        return row;
      });

      return { headers, rows };
    }
  }


};
