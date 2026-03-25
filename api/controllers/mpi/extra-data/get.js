/**
 * @swagger
 *
 * /get:
 *   tags:
 *     - MPI Extra Data
 * tags:
 *   - name: MPI Extra Data
 *     description: Gestione dati extra (HL7, clinici) associati a record MPI
 */

const {ERROR_TYPES} = require('../../../responses/ApiResponse');

module.exports = {
  friendlyName: 'MPI Extra Data Get',
  description: 'Recupera i dati extra di un record MPI, filtrati per scope utente.',

  inputs: {
    mpiId: {type: 'string', required: true},
    categoria: {type: 'string', description: 'Filtra per codice categoria (opzionale)'},
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

      const userScopi = req.tokenData.scopi;
      const appCodice = record.applicazione.codice.toLowerCase();
      const hasAccess = await sails.helpers.scopeMatches(userScopi, `mpi-${appCodice}-read`)
        || await sails.helpers.scopeMatches(userScopi, 'mpi-search');

      if (!hasAccess) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_AUTORIZZATO, errMsg: 'Non hai accesso a questo record MPI'});
      }

      const extraData = await sails.helpers.getExtraDataForMpiRecords.with({
        mpiRecordIds: [record.id],
        userScopi
      });

      let result = extraData[record.id] || {};

      // Filtra per categoria se specificata
      if (inputs.categoria) {
        const catCode = inputs.categoria.toUpperCase();
        result = result[catCode] ? {[catCode]: result[catCode]} : {};
      }

      return res.ApiResponse({data: {mpiId: inputs.mpiId, extraData: result}});
    } catch (err) {
      sails.log.error('Errore MPI extra-data get:', err);
      return res.ApiResponse({errType: ERROR_TYPES.ERRORE_DEL_SERVER, errMsg: 'Errore durante il recupero dati extra'});
    }
  }
};
