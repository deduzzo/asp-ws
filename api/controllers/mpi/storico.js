/**
 * @swagger
 *
 * /storico:
 *   tags:
 *     - MPI
 */

const {ERROR_TYPES} = require('../../responses/ApiResponse');

module.exports = {
  friendlyName: 'MPI Storico',
  description: 'Recupera lo storico delle modifiche di un record MPI.',

  inputs: {
    mpiId: {type: 'string', required: true},
  },

  fn: async function (inputs, exits) {
    const req = this.req;
    const res = this.res;

    try {
      const record = await Anagrafica_MpiRecord.findOne({mpiId: inputs.mpiId})
        .populate('applicazione');

      if (!record) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_TROVATO, errMsg: 'Record MPI non trovato'});
      }

      // Verifica permessi
      const appCodice = record.applicazione.codice.toLowerCase();
      const hasAccess = await sails.helpers.scopeMatches(req.tokenData.scopi, `mpi-${appCodice}-read`)
        || await sails.helpers.scopeMatches(req.tokenData.scopi, 'mpi-search');

      if (!hasAccess) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_AUTORIZZATO, errMsg: 'Non hai i permessi per accedere allo storico'});
      }

      const storico = await Anagrafica_MpiRecordStorico.find({mpiRecord: record.id})
        .sort('createdAt DESC');

      return res.ApiResponse({data: {mpiId: inputs.mpiId, storico}});
    } catch (err) {
      sails.log.error('Errore MPI storico:', err);
      return res.ApiResponse({errType: ERROR_TYPES.ERRORE_DEL_SERVER, errMsg: 'Errore durante il recupero dello storico'});
    }
  }
};
