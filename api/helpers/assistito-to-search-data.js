/**
 * api/helpers/assistiti/to-search-data.js
 */

module.exports = {
  friendlyName: 'Get search data for assistito',

  description: 'Restituisce i dati di ricerca per un assistito',

  inputs: {
    assistito: {
      type: 'json',
      required: true,
      custom: function(value) {
        // Verifica che l'oggetto abbia la struttura corretta
        return _.isObject(value) &&
          !_.isArray(value) &&
          _.has(value, 'id') &&
          _.has(value, 'cf') &&
          _.has(value, 'cognome') &&
          _.has(value, 'nome') &&
          _.has(value, 'dataNascita');
      },
      description: 'Un record del modello Anagrafica_Assistiti'
    }
  },

  exits: {
    success: {
      description: 'Dati di ricerca estratti con successo'
    },
    invalidAssistito: {
      description: 'L\'oggetto fornito non è un valido record di Anagrafica_Assistiti'
    }
  },

  fn: async function (inputs, exits) {
    // Validazione aggiuntiva se necessario
    if (!inputs.assistito) {
      return exits.invalidAssistito();
    }

    let data = {
      id: inputs.assistito.id,
      cf: inputs.assistito.cf,
      cognome: inputs.assistito.cognome,
      nome: inputs.assistito.nome,
      dataNascita: inputs.assistito.dataNascita
    };
    const md5 = sails.helpers.md5(data);
    data.md5 = md5;

    // Estrazione dei dati richiesti
    return exits.success(data);
  }
};
