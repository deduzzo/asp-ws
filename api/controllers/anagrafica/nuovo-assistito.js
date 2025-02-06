/**
 * @swagger
 *
 * /nuovo-assistito:
 *   tags:
 *     - Auth
 * tags:
 *   - name: Auth
 *     description: API di autenticazione
 */




const {utils} = require("aziendasanitaria-utils/src/Utils");

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
      // remove if exists from inputs.assistito the fields: id, createdAt, updatedAt, md5
      const toDelete = ['id', 'createdAt', 'updatedAt', 'md5','eta'];
      toDelete.forEach(field => {
        if (inputs.assistito[field]) {
          delete inputs.assistito[field];
        }
      });
      inputs.assistito['md5'] = utils.calcolaMD5daStringa(JSON.stringify(inputs.assistito));
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
