/**
 * @swagger
 *
 * /get-situazione-medico:
 *   tags:
 *     - Cambio Medico
 */



const MediciService = require('../../services/MediciService');
module.exports = {


  friendlyName: 'Get Situazione medico',


  description: 'Ottieni la situazione di un medico specifico',


  inputs: {
    pf_id: {
      type: 'number',
      required: true,
      description: 'pfID del medico'
    }
  },

  exits: {

  },


  fn: async function (inputs) {

    const result = await MediciService.getSituazioneMedico(inputs.pf_id);
    if (result && result.ok) {
      return this.res.ApiResponse({data: result.data});
    }
    else {
      return this.res.ApiResponse({errType: result.errType, errMsg: result.errMsg});
    }
  }


};
