/**
 * @swagger
 *
 * /get-situazioni-assistenziali-assistito:
 *   tags:
 *     - Cambio Medico
 */


const MediciService = require('../../services/MediciService');
module.exports = {


  friendlyName: 'Get situazioni assistenziali per assistito',


  description: 'Ottieni le situazioni assistenziali per un assistito specifico',


  inputs: {
    codiceFiscale: {
      type: 'string',
      required: true,
      description: 'Codice Fiscale dell\'assistito'
    },
    includeFullData: {
      type: 'boolean',
      description: 'Se true, include dati completi nelle situazioni assistenziali',
      defaultsTo: false
    }
  },


  exits: {

  },


  fn: async function (inputs) {
    const result = await MediciService.getSituazioniAssistenzialiAssistito(inputs.codiceFiscale, inputs.includeFullData);
    if (result && result.ok) {
      return this.res.ApiResponse({data: result.data});
    }
    else {
      return this.res.ApiResponse({errType: result.errType, errMsg: result.errMsg});
    }
  }


};
