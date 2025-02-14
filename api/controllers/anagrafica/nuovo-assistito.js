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
      // verify that exist assistito with cf and md5
      const assistitoEsistente = await Anagrafica_Assistiti.findOne({
        cf: inputs.assistito.cf,
      });
      if (assistitoEsistente) {
        assistitoEsistente.lastCheck = new Date();
        if (assistitoEsistente.md5 === inputs.assistito.md5) {
          await Anagrafica_Assistiti.updateOne({
            id: assistitoEsistente.id,
          }).set(assistitoEsistente);
          return res.ApiResponse({
            errType: ERROR_TYPES.ALREADY_EXISTS,
            errMsg: 'L\'assistito esiste già nel sistema e contiene già i dati aggiornati forniti',
          });
        }
        //update the existing assistito
        await Anagrafica_Assistiti.updateOne({
          id: assistitoEsistente.id,
        }).set(inputs.assistito);
        return res.ApiResponse({
          data: {
            op: 'UPDATE',
            msg: 'Assistito ' +assistitoEsistente.cf + ' aggiornato con successo con nuovo md5: ' + inputs.assistito.md5
          }
        });
      }
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
      data: {
        op: 'CREATE',
        msg: 'Assistito ' + assistitoCreato.cf + ' creato con successo con md5: ' + assistitoCreato.md5,
      }
    });
  }
};
