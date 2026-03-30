const {ERROR_TYPES} = require('../../../responses/ApiResponse');

module.exports = {
  friendlyName: 'Admin MPI Record Annulla',
  swagger: false,
  inputs: {
    mpiId: {type: 'string', required: true},
    motivo: {type: 'string'},
  },
  fn: async function (inputs, exits) {
    var res = this.res;
    var req = this.req;
    try {
      var record = await Anagrafica_MpiRecord.findOne({mpiId: inputs.mpiId});
      if (!record) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_TROVATO, errMsg: 'Record MPI non trovato'});
      }
      if (record.stato === 'annullato') {
        return res.ApiResponse({errType: ERROR_TYPES.ERRORE_GENERICO, errMsg: 'Record gi\u00e0 annullato'});
      }

      await Anagrafica_MpiRecord.updateOne({id: record.id}).set({stato: 'annullato'});

      await Anagrafica_MpiRecordStorico.create({
        mpiRecord: record.id,
        operazione: 'ANNULLA',
        dettaglio: {motivo: inputs.motivo || null, admin: true},
        utente: req.tokenData.username,
        ipAddress: req.ip
      });

      return res.ApiResponse({data: {mpiId: inputs.mpiId, stato: 'annullato'}});
    } catch (err) {
      sails.log.error('Error admin MPI annulla:', err);
      return res.ApiResponse({errType: ERROR_TYPES.ERRORE_DEL_SERVER, errMsg: 'Errore durante l\'annullamento'});
    }
  }
};
