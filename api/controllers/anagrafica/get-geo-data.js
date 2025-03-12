/**
 * @swagger
 *
 * /nuovi-assistiti:
 *   tags:
 *     - Anagrafica
 */

module.exports = {


  friendlyName: 'Get geo data',


  description: '',


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
    }
  },


  exits: {},

  fn: async function (inputs) {
    const res = this.res;
    let data = await Anagrafica_Assistiti.find({
      codComuneResidenza: inputs.codComuneResidenza,
      lat: {'!=': null},
    }).select(['cf', 'lat', 'long', 'geolocPrecise']);
    const cleanedData = data.map(item => _.omit(item, ['createdAt', 'updatedAt']));
    return res.ApiResponse({
      data: cleanedData
    });
  }


};
