module.exports = {


  friendlyName: 'Import form',


  description: 'Importa un form da file JSON e crea il database',


  files: ['formFile'],


  exits: {
    success: {
      description: 'Form importato con successo'
    },
    badRequest: {
      description: 'File o formato non valido',
      responseType: 'badRequest'
    }
  },


  fn: async function (inputs, exits) {
    const fs = require('fs');
    const path = require('path');

    try {
      // Recupera il file caricato
      const uploadedFiles = await this.req.file('formFile').upload({
        maxBytes: 10000000, // 10MB max
        dirname: require('path').resolve(sails.config.appPath, '.tmp/uploads')
      });

      if (!uploadedFiles || uploadedFiles.length === 0) {
        return exits.badRequest({ error: 'No file uploaded' });
      }

      const uploadedFile = uploadedFiles[0];
      const tempFilePath = uploadedFile.fd;

      // Leggi e valida il JSON
      let formDefinition;
      try {
        const fileContent = fs.readFileSync(tempFilePath, 'utf8');
        formDefinition = JSON.parse(fileContent);
      } catch (err) {
        // Pulisci il file temporaneo
        fs.unlinkSync(tempFilePath);
        return exits.badRequest({ error: 'Invalid JSON format' });
      }

      // Valida struttura minima richiesta
      if (!formDefinition.id || !formDefinition.title || !formDefinition.pages) {
        fs.unlinkSync(tempFilePath);
        return exits.badRequest({
          error: 'Invalid form structure. Required: id, title, pages'
        });
      }

      // Valida che l'id sia safe per filesystem
      const formId = formDefinition.id;
      if (!/^[a-zA-Z0-9_-]+$/.test(formId)) {
        fs.unlinkSync(tempFilePath);
        return exits.badRequest({
          error: 'Form ID can only contain letters, numbers, hyphens and underscores'
        });
      }

      // Percorso di destinazione
      const templateDir = path.join(__dirname, '../../../api/data/forms/template');
      const destPath = path.join(templateDir, `${formId}.json`);

      // Verifica se il form esiste già
      const formExists = fs.existsSync(destPath);

      // Crea directory se non esiste
      if (!fs.existsSync(templateDir)) {
        fs.mkdirSync(templateDir, { recursive: true });
      }

      // Copia il file nella destinazione finale
      fs.copyFileSync(tempFilePath, destPath);

      // Pulisci il file temporaneo
      fs.unlinkSync(tempFilePath);

      // Inizializza il database
      await sails.helpers.formDb.with({
        formId: formId,
        action: 'init'
      });

      // Log l'operazione
      const logData = {
        level: 'info',
        tag: 'FORMS_ADMIN',
        message: `Form ${formExists ? 'updated' : 'imported'}: ${formId}`,
        action: formExists ? `update_form_${formId}` : `import_form_${formId}`,
        ipAddress: this.req.ip,
        context: {
          formId: formId,
          formTitle: formDefinition.title,
          pagesCount: formDefinition.pages.length,
          fieldsCount: formDefinition.pages.reduce((sum, page) => sum + page.fields.length, 0)
        }
      };

      if (this.req.user && this.req.user.id) {
        logData.user = this.req.user.id;
      }

      await sails.helpers.log.with(logData);

      return exits.success({
        success: true,
        message: formExists ? 'Form aggiornato con successo' : 'Form importato con successo',
        formId: formId,
        formTitle: formDefinition.title,
        isUpdate: formExists
      });

    } catch (err) {
      sails.log.error('Error importing form:', err);
      return exits.badRequest({
        error: 'Import failed',
        message: err.message
      });
    }
  }


};
