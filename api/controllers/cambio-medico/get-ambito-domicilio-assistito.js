/**
 * @swagger
 *
 * /get-ambito-domicilio-assistito:
 *   tags:
 *     - Cambio Medico
 */



const MediciService = require('../../services/MediciService');
module.exports = {


  friendlyName: 'Get ambito domicilio assistito',


  description: 'Ottieni l\'ambito del domicilio dell\'assistito dato il suo codice fiscale.',


  inputs: {
    codiceFiscale: {
      type: 'string',
      required: true,
      description: 'Il codice fiscale dell\'assistito'
    },
    situazioneAssistenziale: {
      type: 'string',
      required: false,
      defaultsTo: '4',
      description: 'La situazione assistenziale dell\'assistito, default 4 (domiciliato e residente in regione)'
    }
  },


  exits: {

  },


  fn: async function (inputs) {
    const result = await MediciService.getAmbitiDomicilioAssistito(inputs.codiceFiscale, inputs.situazioneAssistenziale);
    if (result && result.ok) {
      return this.res.ApiResponse({data: result.data});
    }
    else {
      return this.res.ApiResponse({errType: result.errType, errMsg: result.errMsg});
    }
  }


};
