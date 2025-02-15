/**
 * @swagger
 *
 * /nuovi-assistiti:
 *   tags:
 *     - Anagrafica
 */

const {utils} = require('aziendasanitaria-utils/src/Utils');
const {ERROR_TYPES} = require('../../responses/ApiResponse');

module.exports = {
  friendlyName: 'Nuovi assistiti',
  description: 'Crea uno (o più) assistiti nel sistema. E\' richiesto livello di autorizzazione admin.',
  inputs: {
    assistiti: {
      type: 'ref',
      description: 'Array di assistiti da inserire (omettere id, createdAt, updatedAt e md5)',
      required: true,
      custom: (value) => {
        return Array.isArray(value) && value.length >0 && value.length <100 && value.every(async item => {
          return await sails.helpers.isValidModel.with({
            item: item,
            modelName: 'anagrafica_assistiti'
          });
        });
      }
    },
  },

  exits: {},

  fn: async function (inputs) {
    let assistitoCreato = null;
    const res = this.res;
    const responses = [];
    const toDelete = ['id', 'createdAt', 'updatedAt', 'md5', 'eta', 'lastCheck'];
    let someError = false;
    for (let assistito of inputs.assistiti) {
      if (!assistito.cf) {
        responses.push({
          assistito: assistito,
          statusCode: 400,
          errType: ERROR_TYPES.BAD_REQUEST,
          errMsg: 'Il codice fiscale è obbligatorio',
        });
        someError = true;
        break;
      }
      try {
        // remove if exists from assistito the fields: id, createdAt, updatedAt, md5
        toDelete.forEach(field => {
          if (assistito[field]) {
            delete assistito[field];
          }
        });
        assistito['md5'] = utils.calcolaMD5daStringa(JSON.stringify(assistito));
        // verify that exist assistito with cf and md5
        let assistitoEsistente = await Anagrafica_Assistiti.findOne({
          cf: assistito.cf,
        });
        if (assistitoEsistente) {
          assistito.lastCheck = new Date();
          if (assistitoEsistente.md5 === assistito.md5) {
            await Anagrafica_Assistiti.updateOne({
              id: assistitoEsistente.id,
            }).set(assistito);
            responses.push({
              assistito: assistito.cf,
              statusCode: 409,
              errType: ERROR_TYPES.ALREADY_EXISTS,
              errMsg: 'L\'assistito esiste già nel sistema e contiene già i dati aggiornati forniti',
            });
            break;
          }
          //update the existing assistito
          await Anagrafica_Assistiti.updateOne({
            id: assistitoEsistente.id,
          }).set(assistito);
          responses.push({
            assistito: assistito.cf,
            statusCode: 200,
            op: 'UPDATE',
            msg: 'Assistito ' + assistitoEsistente.cf + ' aggiornato con successo con nuovo md5: ' + assistito.md5,
          });
          break;
        }
        assistitoCreato = await Anagrafica_Assistiti.create(assistito).fetch();
      } catch (err) {
        responses.push({
          assistito: assistito,
          statusCode: 400,
          errType: ERROR_TYPES.BAD_REQUEST,
          errMsg: 'I dati forniti non sono conformi al modello: ' + err.message,
          details: err.details
        });
        someError = true;
        break;
      }
      responses.push({
        assistito: assistito.cf,
        statusCode: 200,
        op: 'CREATE',
        msg: 'Assistito ' + assistitoCreato.cf + ' creato con successo con md5: ' + assistitoCreato.md5,
      });
    }
    if (someError) {
      return res.ApiResponse({
        errType: ERROR_TYPES.MULTIPLE_ERRORS,
        errMsg: 'Alcuni assistiti non sono stati inseriti correttamente',
        data: responses
      });
    } else {
      return res.ApiResponse({
        statusCode: 200,
        op: 'MULTIPLE',
        msg: 'Tutti gli assistiti sono stati inseriti o aggiornati correttamente',
        data: responses
      });
    }
  }
};
