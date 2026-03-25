/**
 * @swagger
 *
 * /storico:
 *   tags:
 *     - MPI Extra Data
 */

const {ERROR_TYPES} = require('../../../responses/ApiResponse');

module.exports = {
  friendlyName: 'MPI Extra Data Storico',
  description: 'Recupera lo storico delle modifiche ai dati extra di un record MPI.',

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

      // Trova i valori extra data per questo record
      const valoriCriteria = {mpiRecord: record.id};

      if (inputs.categoria) {
        const cat = await Anagrafica_ExtraDataCategorie.findOne({codice: inputs.categoria.toUpperCase()});
        if (cat) {
          valoriCriteria.categoria = cat.id;
        }
      }

      const valori = await Anagrafica_MpiExtraDataValori.find(valoriCriteria);
      const valoriIds = valori.map(v => v.id);

      if (valoriIds.length === 0) {
        return res.ApiResponse({data: {mpiId: inputs.mpiId, storico: []}});
      }

      const storico = await Anagrafica_MpiExtraDataStorico.find({
        valore: {in: valoriIds}
      }).sort('createdAt DESC').populate('valore');

      return res.ApiResponse({data: {mpiId: inputs.mpiId, storico}});
    } catch (err) {
      sails.log.error('Errore MPI extra-data storico:', err);
      return res.ApiResponse({errType: ERROR_TYPES.ERRORE_DEL_SERVER, errMsg: 'Errore durante il recupero storico'});
    }
  }
};
