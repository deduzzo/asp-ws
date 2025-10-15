module.exports = {


  friendlyName: 'Forms admin view',


  description: 'Pagina admin per visualizzare le submissions di un form specifico',


  exits: {
    success: {
      description: 'Admin view page rendered successfully'
    },
    notFound: {
      responseType: 'notFound'
    }
  },


  fn: async function (inputs, exits) {
    const formId = this.req.param('id');
    const fs = require('fs');
    const path = require('path');

    if (!formId) {
      return exits.notFound();
    }

    try {
      // Leggi la definizione del form
      const formPath = path.join(sails.config.appPath, 'api', 'data', 'forms', 'template', `${formId}.json`);

      if (!fs.existsSync(formPath)) {
        return exits.notFound();
      }

      const formDefinition = JSON.parse(fs.readFileSync(formPath, 'utf8'));

      // Estrai tutti i campi del form per le colonne
      const fields = [];
      if (formDefinition.pages) {
        formDefinition.pages.forEach(page => {
          page.fields.forEach(field => {
            fields.push({
              id: field.id,
              label: field.label,
              type: field.type
            });
          });
        });
      }

      // Render direttamente l'EJS senza layout di Sails
      const ejs = require('ejs');
      const viewPath = path.join(sails.config.appPath, 'views', 'pages', 'forms', 'admin-view.ejs');
      const template = fs.readFileSync(viewPath, 'utf8');

      const html = ejs.render(template, {
        formId: formId,
        formTitle: formDefinition.title,
        formDescription: formDefinition.description,
        fields: fields
      });

      return this.res.send(html);

    } catch (err) {
      sails.log.error('Error loading form admin view:', err);
      return exits.notFound();
    }
  }


};
