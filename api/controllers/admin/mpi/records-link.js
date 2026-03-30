const {ERROR_TYPES} = require('../../../responses/ApiResponse');

module.exports = {
  friendlyName: 'Admin MPI Record Link',
  swagger: false,
  inputs: {
    mpiId: {type: 'string', required: true},
    cf: {type: 'string', required: true},
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
        return res.ApiResponse({errType: ERROR_TYPES.ERRORE_GENERICO, errMsg: 'Impossibile collegare un record annullato'});
      }

      var cf = inputs.cf.toUpperCase();
      var assistito = await Anagrafica_Assistiti.findOne({cf: cf});
      if (!assistito) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_TROVATO, errMsg: 'Assistito con CF ' + cf + ' non trovato in anagrafica'});
      }

      await Anagrafica_MpiRecord.updateOne({id: record.id}).set({
        assistito: assistito.id,
        stato: 'identificato',
        dataIdentificazione: Date.now(),
        utenteIdentificazione: req.tokenData.username
      });

      await Anagrafica_MpiRecordStorico.create({
        mpiRecord: record.id,
        operazione: 'LINK',
        dettaglio: {cf: cf, assistitoId: assistito.id, admin: true},
        utente: req.tokenData.username,
        ipAddress: req.ip
      });

      return res.ApiResponse({
        data: {
          mpiId: inputs.mpiId,
          assistito: {cf: assistito.cf, cognome: assistito.cognome, nome: assistito.nome}
        }
      });
    } catch (err) {
      sails.log.error('Error admin MPI link:', err);
      return res.ApiResponse({errType: ERROR_TYPES.ERRORE_DEL_SERVER, errMsg: 'Errore durante il collegamento'});
    }
  }
};
