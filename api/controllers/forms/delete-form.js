module.exports = {


  friendlyName: 'Delete form',


  description: 'Elimina un form (JSON template e database) - solo admin',


  inputs: {},


  exits: {
    success: {
      description: 'Form eliminato con successo'
    },
    notFound: {
      description: 'Form non trovato',
      responseType: 'notFound'
    },
    badRequest: {
      description: 'Richiesta non valida',
      responseType: 'badRequest'
    }
  },


  fn: async function (inputs, exits) {
    const fs = require('fs');
    const path = require('path');

    try {
      // Get formId from URL parameter
      const formId = this.req.param('formId');

      if (!formId) {
        return exits.badRequest({
          error: 'formId is required'
        });
      }

      // Validate formId
      if (!/^[a-zA-Z0-9_-]+$/.test(formId)) {
        return exits.badRequest({
          error: 'Invalid form ID format'
        });
      }

      // Percorsi
      const templateDir = path.join(sails.config.appPath, 'api', 'data', 'forms', 'template');
      const dataDir = path.join(sails.config.appPath, 'api', 'data', 'forms', 'data');
      const jsonPath = path.join(templateDir, `${formId}.json`);
      const dbPath = path.join(dataDir, `${formId}_data.db`);

      // Verifica esistenza form
      if (!fs.existsSync(jsonPath)) {
        return exits.notFound({
          error: 'Form not found'
        });
      }

      // Leggi il form prima di eliminarlo per il log
      let formTitle = formId;
      try {
        const formData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        formTitle = formData.title || formId;
      } catch (err) {
        sails.log.warn('Could not read form title before deletion:', err.message);
      }

      // Elimina il file JSON
      fs.unlinkSync(jsonPath);
      sails.log.info(`Form JSON deleted: ${jsonPath}`);

      // Elimina il database se esiste
      let dbDeleted = false;
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        dbDeleted = true;
        sails.log.info(`Form database deleted: ${dbPath}`);
      }

      // Elimina anche i file WAL e SHM di SQLite se esistono
      const walPath = `${dbPath}-wal`;
      const shmPath = `${dbPath}-shm`;
      if (fs.existsSync(walPath)) {
        fs.unlinkSync(walPath);
      }
      if (fs.existsSync(shmPath)) {
        fs.unlinkSync(shmPath);
      }

      // Log l'operazione
      const logData = {
        level: 'warn',
        tag: 'FORMS_ADMIN',
        message: `Form deleted: ${formId}`,
        action: `delete_form_${formId}`,
        ipAddress: this.req.ip,
        context: {
          formId: formId,
          formTitle: formTitle,
          dbDeleted: dbDeleted
        }
      };

      if (this.req.user && this.req.user.id) {
        logData.user = this.req.user.id;
      }

      await sails.helpers.log.with(logData);

      return exits.success({
        success: true,
        message: 'Form eliminato con successo',
        formId: formId,
        formTitle: formTitle,
        dbDeleted: dbDeleted
      });

    } catch (err) {
      sails.log.error('Error deleting form:', err);
      return exits.badRequest({
        error: 'Delete failed',
        message: err.message
      });
    }
  }


};
