/**
 * @swagger
 *
 * /get-geo-data:
 *   tags:
 *     - Anagrafica
 */

const {ERROR_TYPES} = require('../../responses/ApiResponse');
module.exports = {
  friendlyName: 'Assistiti in base ai dati geografici per comune di residenza',
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
    let data = null;
    let criteria = {};
    let campi = ['cf', 'capResidenza', 'indirizzoResidenza', 'lat', 'long', 'geolocPrecise'];
    if (inputs.onlyGeoloc === true) {
      criteria = {
        codComuneResidenza: inputs.codComuneResidenza,
        lat: {'!=': null}
      };
    }
    if (inputs.onlyGeolocationPrecise === true) {
      criteria = {...criteria, geolocPrecise: true};
    }
    if (Object.keys(criteria).length !== 0)  // indirizzoResidenza not null OR cap not null
      data = await Anagrafica_Assistiti.find({
        select: campi,
        where: criteria
      });
    else {

      let query = ` select \`cf\`, \`capResidenza\`, \`indirizzoResidenza\`, \`lat\`, \`long\`, \`geolocPrecise\`
                    FROM ${Anagrafica_Assistiti.tableName}
                    WHERE lat IS NULL
                      AND codComuneResidenza = $1
                      AND (indirizzoResidenza IS NOT NULL OR capResidenza IS NOT NULL)`;
      let rawResult = await Anagrafica_Assistiti.getDatastore().sendNativeQuery(query, [inputs.codComuneResidenza]);
      data = rawResult.rows;
    }
    const cleanedData = data.map(item => _.omit(item, ['createdAt', 'updatedAt']));
    if (cleanedData.length === 0) {
      return res.ApiResponse({
        errType: ERROR_TYPES.NOT_FOUND,
        errMsg: 'Nessun assistito trovato'
      });
    } else {
      return res.ApiResponse({
        data: cleanedData
      });
    }
  }
}
;
