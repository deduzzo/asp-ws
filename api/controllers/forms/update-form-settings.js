module.exports = {


  friendlyName: 'Update form settings',


  description: 'Aggiorna le impostazioni di un form (solo admin)',


  inputs: {
    notifications: {
      type: 'ref',
      description: 'Impostazioni notifiche'
    }
  },


  exits: {
    success: {
      description: 'Impostazioni aggiornate con successo'
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
        return this.res.ApiResponse({
          errType: 'BAD_REQUEST',
          errMsg: 'formId is required'
        });
      }

      // Validate formId
      if (!/^[a-zA-Z0-9_-]+$/.test(formId)) {
        return this.res.ApiResponse({
          errType: 'BAD_REQUEST',
          errMsg: 'Invalid form ID format'
        });
      }

      // Percorso del template
      const templateDir = path.join(sails.config.appPath, 'api', 'data', 'forms', 'template');
      const jsonPath = path.join(templateDir, `${formId}.json`);

      // Verifica esistenza form
      if (!fs.existsSync(jsonPath)) {
        return this.res.ApiResponse({
          errType: 'NOT_FOUND',
          errMsg: 'Form not found'
        });
      }

      // Leggi il form corrente
      let formData;
      try {
        formData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      } catch (err) {
        sails.log.error('Error reading form:', err);
        return this.res.ApiResponse({
          errType: 'SERVER_ERROR',
          errMsg: 'Error reading form data'
        });
      }

      // Aggiorna le impostazioni
      if (inputs.notifications) {
        formData.notifications = {
          ...formData.notifications,
          ...inputs.notifications
        };
      }

      // Salva il file aggiornato
      try {
        fs.writeFileSync(jsonPath, JSON.stringify(formData, null, 2), 'utf8');
      } catch (err) {
        sails.log.error('Error writing form:', err);
        return this.res.ApiResponse({
          errType: 'SERVER_ERROR',
          errMsg: 'Error saving form data'
        });
      }

      // Log l'operazione
      const logData = {
        level: 'info',
        tag: 'FORMS_ADMIN',
        message: `Form settings updated: ${formId}`,
        action: `update_form_settings_${formId}`,
        ipAddress: this.req.ip,
        context: {
          formId: formId,
          notifications: inputs.notifications
        }
      };

      if (this.req.user && this.req.user.id) {
        logData.user = this.req.user.id;
      }

      await sails.helpers.log.with(logData);

      return this.res.ApiResponse({
        data: {
          success: true,
          message: 'Impostazioni aggiornate con successo',
          formId: formId,
          notifications: formData.notifications
        }
      });

    } catch (err) {
      sails.log.error('Error updating form settings:', err);
      return this.res.ApiResponse({
        errType: 'SERVER_ERROR',
        errMsg: 'Errore durante l\'aggiornamento delle impostazioni: ' + err.message
      });
    }
  }


};
