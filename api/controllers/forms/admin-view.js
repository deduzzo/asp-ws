module.exports = {


  friendlyName: 'Forms admin view',


  description: 'Pagina admin per visualizzare le submissions di un form specifico',


  exits: {
    success: {
      viewTemplatePath: 'pages/forms/admin-view'
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

      return exits.success({
        formId: formId,
        formTitle: formDefinition.title,
        formDescription: formDefinition.description,
        fields: fields
      });

    } catch (err) {
      sails.log.error('Error loading form admin view:', err);
      return exits.notFound();
    }
  }


};
