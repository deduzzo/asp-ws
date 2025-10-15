module.exports = {


  friendlyName: 'Forms admin index',


  description: 'Pagina admin per gestire i form e le submissions',


  exits: {
    success: {
      description: 'Admin page rendered successfully'
    }
  },


  fn: async function (inputs, exits) {
    const fs = require('fs');
    const path = require('path');

    try {
      // Leggi tutti i form disponibili
      const templateDir = path.join(sails.config.appPath, 'api', 'data', 'forms', 'template');
      const files = fs.readdirSync(templateDir);

      const forms = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const formPath = path.join(templateDir, file);
          const formData = JSON.parse(fs.readFileSync(formPath, 'utf8'));

          // Conta le submissions (se esiste il database)
          const dataDir = path.join(sails.config.appPath, 'api', 'data', 'forms', 'data');
          const dbPath = path.join(dataDir, `${formData.id}_data.db`);
          let submissionsCount = 0;

          if (fs.existsSync(dbPath)) {
            try {
              const result = await sails.helpers.formDb.with({
                formId: formData.id,
                action: 'getAll',
                data: {}
              });
              submissionsCount = result.total;
            } catch (err) {
              sails.log.warn(`Error counting submissions for ${formData.id}:`, err.message);
            }
          }

          forms.push({
            id: formData.id,
            title: formData.title,
            description: formData.description,
            pages: formData.pages ? formData.pages.length : 0,
            submissionsCount: submissionsCount,
            recaptchaEnabled: formData.recaptcha?.enabled || false
          });
        }
      }

      // Render direttamente l'EJS senza layout di Sails
      const ejs = require('ejs');
      const viewPath = path.join(sails.config.appPath, 'views', 'pages', 'forms', 'admin-index.ejs');
      const template = fs.readFileSync(viewPath, 'utf8');

      const html = ejs.render(template, {
        forms: forms
      });

      return this.res.send(html);

    } catch (err) {
      sails.log.error('Error loading forms admin:', err);
      return this.res.serverError('Errore caricamento pagina admin');
    }
  }


};
