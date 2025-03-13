/**
 * @swagger
 *
 * /get-geo-data:
 *   tags:
 *     - Anagrafica
 */

const {ERROR_TYPES} = require("../../responses/ApiResponse");
module.exports = {
  friendlyName: 'Ottieni i dati geografici degli assistiti per comune di residenza',
  description: 'Ottieni i dati geografici degli assistiti per comune di residenza',
  inputs: {
    // codComuneResidenza
    codComuneResidenza: {
      type: 'string',
      required: true,
      description: 'Codice del comune di residenza'
    },
    onlyGeolocationPrecise: {
      type: 'boolean',
      description: 'Se true, ritorna solo i record con geolocazione precisa',
      defaultsTo: false
    },
    onlyGeoloc: {
      type: 'boolean',
      description: 'Se true, ritorna solo i record geolocalizzati',
      defaultsTo: false
    }
  },
  exits: {},

  fn: async function (inputs) {
    const res = this.res;
    let criteria = {};
    let campi = ['cf', 'capResidenza', 'indirizzoResidenza', 'lat', 'long', 'geolocPrecise'];
    if (inputs.onlyGeoloc === true)
      criteria = {
        codComuneResidenza: inputs.codComuneResidenza,
        lat: {'!=': null}
      };
    if (inputs.onlyGeolocationPrecise === true)
      criteria = {...criteria, geolocPrecise: true};
    if (Object.keys(criteria).length === 0
    ) { // indirizzoResidenza not null OR cap not null
      criteria = {
        and: [
          {
            lat: null,
            codComuneResidenza: inputs.codComuneResidenza,
          },
          {
            or: [
              {indirizzoResidenza: {'!=': null}},
              {capResidenza: {'!=': null}}
            ]
          }
        ]
      };
    }
    let data = await Anagrafica_Assistiti.find({
      where: criteria
    }).select(campi);
    const cleanedData = data.map(item => _.omit(item, ['createdAt', 'updatedAt']));
    if (cleanedData.length === 0)
      return res.ApiResponse({
        errType: ERROR_TYPES.NOT_FOUND,
        errMsg: 'Nessun assistito trovato'
      });
    else
      return res.ApiResponse({
        data: cleanedData
      });
  }
}
;
