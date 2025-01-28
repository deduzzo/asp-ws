module.exports = {
  friendlyName: 'Nuovo assistito',
  description: 'Crea un nuovo assistito nel sistema',

  inputs: {
    assistito: {
      type: 'ref',
      model: 'anagrafica_assistiti',
      description: 'Dati dell\'assistito da inserire',
      meta: {
        swagger: {
          in: 'body',
        }
      },
    },
  },

  exits: {
    success: {
      description: 'Assistito creato con successo'
    },
    badRequest: {
      description: 'I dati forniti non sono validi',
      responseType: 'badRequest'
    }
  },

  fn: async function (inputs, exits) {
    let assistitoCreato = null;
    try {
      assistitoCreato = await Anagrafica_Assistiti.create(inputs.assistito)
        .fetch();
    } catch (err) {
      return exits.badRequest({
        message: 'I dati forniti non sono conformi al modello',
        details: err.details
      });
    }
    return exits.success({
      message: 'Assistito creato con successo',
      data: assistitoCreato
    });
  }
};
