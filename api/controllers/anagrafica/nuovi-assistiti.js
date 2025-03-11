/**
 * @swagger
 *
 * /nuovi-assistiti:
 *   tags:
 *     - Anagrafica
 */

const {utils} = require('aziendasanitaria-utils/src/Utils');
const {ERROR_TYPES} = require('../../responses/ApiResponse');
const {getGeoAssistito} = require('../../services/AssistitoService');
const maxAssistiti = 1000;

module.exports = {
  friendlyName: 'Nuovi assistiti',
  description: 'Crea uno (o più) assistiti nel sistema. E\' richiesto livello di autorizzazione admin.',
  inputs: {
    assistiti: {
      type: 'ref',
      description: 'Array di assistiti da inserire (omettere id, createdAt, updatedAt e md5), Max: ' + maxAssistiti,
      required: true,
      example: {
        array: [
          {
            cf: 'RSSMRA80A01H501V',
            cfNormalizzato: 'RSSMRA80A01H501V',
            cognome: 'Rossi',
            nome: 'Mario',
            sesso: 'M',
            dataNascita: 315446400,
            comuneNascita: 'Roma',
            codComuneNascita: 'H501',
            codIstatComuneNascita: '058091',
            provinciaNascita: 'RM',
            indirizzoResidenza: 'Via Roma 1',
            capResidenza: '00100',
            comuneResidenza: 'Roma',
            codComuneResidenza: 'H501',
            codIstatComuneResidenza: '058091',
            asp: '201',
            ssnTipoAssistito: 'R',
            ssnInizioAssistenza: 1577836800,
            ssnFineAssistenza: 1735689600,
            ssnMotivazioneFineAssistenza: 'Scadenza naturale',
            ssnNumeroTessera: '80123456',
            MMGUltimaOperazione: 'SCELTA',
            MMGUltimoStato: 'ATTIVO',
            MMGTipo: 'MMG',
            MMGCodReg: '123456',
            MMGNome: 'Giuseppe',
            MMGCognome: 'Bianchi',
            MMGCf: 'BNCGPP70B01H501X',
            MMGDataScelta: 1577836800,
            MMGDataRevoca: null,
            dataDecesso: null
          },
          {
            cf: 'VRDLCU85M41H501Y',
            cfNormalizzato: 'VRDLCU85M41H501Y',
            cognome: 'Verdi',
            nome: 'Lucia',
            sesso: 'F',
            dataNascita: 493344000,
            comuneNascita: 'Roma',
            codComuneNascita: 'H501',
            codIstatComuneNascita: '058091',
            provinciaNascita: 'RM',
            indirizzoResidenza: 'Via Napoli 42',
            capResidenza: '00100',
            comuneResidenza: 'Roma',
            codComuneResidenza: 'H501',
            codIstatComuneResidenza: '058091',
            asp: '201',
            ssnTipoAssistito: 'R',
            ssnInizioAssistenza: 1609459200,
            ssnFineAssistenza: 1767225600,
            ssnMotivazioneFineAssistenza: 'Scadenza naturale',
            ssnNumeroTessera: '80789012',
            MMGUltimaOperazione: 'SCELTA',
            MMGUltimoStato: 'ATTIVO',
            MMGTipo: 'MMG',
            MMGCodReg: '789012',
            MMGNome: 'Maria',
            MMGCognome: 'Neri',
            MMGCf: 'NREMRA75C41H501Z',
            MMGDataScelta: 1609459200,
            MMGDataRevoca: null,
            dataDecesso: null
          }
        ]
      },
      custom: (value) => {
        return Array.isArray(value) &&
          value.length > 0 &&
          value.length <= maxAssistiti &&
          value.every(async item => {
            return await sails.helpers.isValidModel.with({
              item: item,
              modelName: 'anagrafica_assistiti'
            });
          });
      }
    }
  },
  exits: {},
  fn: async function (inputs) {
    let assistitoCreato = null;
    const res = this.res;
    const responses = [];
    const toDelete = ['id', 'createdAt', 'updatedAt', 'md5', 'eta', 'lastCheck'];
    let someError = false;

    for (let assistito of inputs.assistiti) {
      let currentResponse = null;
      if (!assistito.cf) {
        currentResponse = {
          assistito: assistito,
          statusCode: 400,
          err: {
            code: ERROR_TYPES.BAD_REQUEST,
            msg: 'Il codice fiscale è obbligatorio'
          },
        };
        someError = true;
      } else {
        try {
          toDelete.forEach(field => {
            if (assistito[field]) {
              delete assistito[field];
            }
          });
          assistito['md5'] = utils.calcolaMD5daStringa(JSON.stringify(assistito));

          let assistitoEsistente = await Anagrafica_Assistiti.findOne({
            cf: assistito.cf,
          });

          if (assistitoEsistente) {
            assistito.lastCheck = utils.nowToUnixDate();
            if (assistitoEsistente.lat === null) {
              const geoloc = await getGeoAssistito(assistito);
              if (geoloc) {
                assistito.lat = geoloc.lat;
                assistito.long = geoloc.lon;
                assistito.geolocPrecise = geoloc.precise;
              }
            }
            if (assistitoEsistente.md5 === assistito.md5) {
              currentResponse = {
                assistito: assistito.cf,
                statusCode: 409,
                err: {
                  code: ERROR_TYPES.ALREADY_EXISTS,
                  msg: 'L\'assistito esiste già nel sistema e contiene già i dati forniti',
                },
              };
            }

            await Anagrafica_Assistiti.updateOne({
              id: assistitoEsistente.id,
            }).set(assistito);
            if (currentResponse === null) {
              currentResponse = {
                assistito: assistito.cf,
                statusCode: 200,
                op: 'UPDATE',
                msg: 'Assistito ' + assistitoEsistente.cf + ' aggiornato con successo con nuovo md5: ' + assistito.md5,
              };
            }
          } else {
            assistitoCreato = await Anagrafica_Assistiti.create(assistito).fetch();
          }
        } catch (err) {
          currentResponse = {
            assistito: assistito,
            statusCode: 400,
            err: {
              code: ERROR_TYPES.BAD_REQUEST,
              msg: 'I dati forniti non sono conformi al modello: ' + err.message,
            },
            details: err.details
          };
          someError = true;
        }

        if (currentResponse === null) {
          currentResponse = {
            assistito: assistito.cf,
            statusCode: 200,
            op: 'CREATE',
            msg: 'Assistito ' + assistitoCreato.cf + ' creato con successo con md5: ' + assistitoCreato.md5,
          };
        }
      }
      responses.push(currentResponse);
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
}
