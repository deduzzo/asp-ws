const {ERROR_TYPES} = require('../../../responses/ApiResponse');

module.exports = {
  friendlyName: 'Admin MPI Record Storico',
  swagger: false,
  inputs: {
    mpiId: {type: 'string', required: true},
  },
  fn: async function (inputs, exits) {
    var res = this.res;
    try {
      var record = await Anagrafica_MpiRecord.findOne({mpiId: inputs.mpiId});
      if (!record) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_TROVATO, errMsg: 'Record MPI non trovato'});
      }
      var storico = await Anagrafica_MpiRecordStorico.find({mpiRecord: record.id}).sort('createdAt DESC');
      return res.ApiResponse({data: {storico: storico}});
    } catch (err) {
      sails.log.error('Error admin MPI storico:', err);
      return res.ApiResponse({errType: ERROR_TYPES.ERRORE_DEL_SERVER, errMsg: 'Errore nel caricamento storico'});
    }
  }
};
