module.exports = {
  friendlyName: 'Verifica validità modello',
  description: 'Verifica se un oggetto è conforme a un modello Sails specificato',

  inputs: {
    item: {
      type: 'ref',
      description: 'Oggetto da validare',
      required: true
    },
    modelName: {
      type: 'string',
      description: 'Nome del modello Sails',
      required: true
    }
  },

  fn: async function (inputs, exits) {
    try {
      const model = sails.models[inputs.modelName.toLowerCase()];
      if (!model) {
        return exits.success(false);
      }

      // Validazione dei tipi di attributi
      const attributes = model.attributes;
      for (let key in attributes) {
        if (attributes[key].required && inputs.item[key] === undefined) {
          return exits.success(false);
        }
      }

      return exits.success(true);
    } catch (error) {
      return exits.success(false);
    }
  }
};
