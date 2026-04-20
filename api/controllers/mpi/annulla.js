/**
 * @swagger
 *
 * /annulla:
 *   tags:
 *     - MPI
 */

const {ERROR_TYPES} = require('../../responses/ApiResponse');
const MetricsService = require('../../services/MetricsService');

module.exports = {
  friendlyName: 'MPI Annulla',
  description: 'Annulla un record MPI (creato per errore).',

  inputs: {
    mpiId: {type: 'string', required: true},
    motivo: {type: 'string', description: 'Motivo dell\'annullamento'},
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

      if (record.stato === 'annullato') {
        return res.ApiResponse({errType: ERROR_TYPES.ERRORE_GENERICO, errMsg: 'Record già annullato'});
      }

      const appCodice = record.applicazione.codice.toLowerCase();
      if (!await sails.helpers.scopeMatches(req.tokenData.scopi, `mpi-${appCodice}-write`)) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_AUTORIZZATO, errMsg: 'Non hai i permessi di scrittura per questa applicazione MPI'});
      }

      MetricsService.mpiOpsTotal.inc({ operation: 'annulla' });
      await Anagrafica_MpiRecord.updateOne({id: record.id}).set({stato: 'annullato'});

      await Anagrafica_MpiRecordStorico.create({
        mpiRecord: record.id,
        operazione: 'ANNULLA',
        dettaglio: {statoPrecedente: record.stato, motivo: inputs.motivo || null},
        utente: req.tokenData.username,
        ipAddress: req.ip,
      });

      await sails.helpers.log.with({
        level: 'info',
        tag: 'MPI_ANNULLA',
        message: `Record MPI annullato: ${inputs.mpiId}`,
        action: 'mpi-annulla',
        ipAddress: req.ip,
        user: req.tokenData.username,
        context: {mpiId: inputs.mpiId, motivo: inputs.motivo}
      });

      return res.ApiResponse({data: {mpiId: inputs.mpiId, stato: 'annullato'}});
    } catch (err) {
      sails.log.error('Errore MPI annulla:', err);
      return res.ApiResponse({errType: ERROR_TYPES.ERRORE_DEL_SERVER, errMsg: 'Errore durante l\'annullamento'});
    }
  }
};
