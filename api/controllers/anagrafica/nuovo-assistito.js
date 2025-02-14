/**
 * @swagger
 *
 * /nuovo-assistito:
 *   tags:
 *     - Anagrafica
 */

const {utils} = require('aziendasanitaria-utils/src/Utils');
const {ERROR_TYPES} = require('../../responses/ApiResponse');

module.exports = {
  friendlyName: 'Nuovo assistito',
  description: 'Crea un nuovo assistito nel sistema. E\' richiesto livello di autorizzazione admin.',
  inputs: {
    assistito: {
      type: 'ref',
      model: 'anagrafica_assistiti',
      description: 'Dati dell\'assistito da inserire (omettere id, createdAt, updatedAt, ed md5)',
      // omit id, createdAt, updatedAt, md5
      required: true,
    },
  },

  exits: {},

  fn: async function (inputs, exits) {
    let assistitoCreato = null;
    const res = this.res;
    try {
      // remove if exists from inputs.assistito the fields: id, createdAt, updatedAt, md5
      const toDelete = ['id', 'createdAt', 'updatedAt', 'md5', 'eta'];
      toDelete.forEach(field => {
        if (inputs.assistito[field]) {
          delete inputs.assistito[field];
        }
      });
      inputs.assistito['md5'] = utils.calcolaMD5daStringa(JSON.stringify(inputs.assistito));
      assistitoCreato = await Anagrafica_Assistiti.create(inputs.assistito)
        .fetch();
    } catch (err) {
      return res.ApiResponse({
        errType: ERROR_TYPES.BAD_REQUEST,
        errMsg: 'I dati forniti non sono conformi al modello' + err.message,
        details: err.details
      });
    }
    return res.ApiResponse({
      data: assistitoCreato
    });
  }
};
