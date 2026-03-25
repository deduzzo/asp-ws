/**
 * @swagger
 *
 * /delete:
 *   tags:
 *     - MPI Extra Data
 */

const {ERROR_TYPES} = require('../../../responses/ApiResponse');

module.exports = {
  friendlyName: 'MPI Extra Data Delete',
  description: 'Elimina dati extra da un record MPI.',

  inputs: {
    mpiId: {type: 'string', required: true},
    categoria: {type: 'string', required: true},
    chiavi: {type: 'json', required: true, description: 'Array di chiavi da eliminare'},
  },

  fn: async function (inputs, exits) {
    const req = this.req;
    const res = this.res;

    try {
      const userScopi = req.tokenData.scopi;
      const username = req.tokenData.username;
      const ipAddress = req.ip;

      const record = await Anagrafica_MpiRecord.findOne({mpiId: inputs.mpiId})
        .populate('applicazione');

      if (!record) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_TROVATO, errMsg: 'Record MPI non trovato'});
      }

      const appCodice = record.applicazione.codice.toLowerCase();
      if (!await sails.helpers.scopeMatches(userScopi, `mpi-${appCodice}-write`)) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_AUTORIZZATO, errMsg: 'Non hai permessi di scrittura per questa app MPI'});
      }

      const cat = await Anagrafica_ExtraDataCategorie.findOne({codice: inputs.categoria.toUpperCase(), attivo: true});
      if (!cat) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_TROVATO, errMsg: 'Categoria non trovata o non attiva'});
      }

      if (!sails.helpers.scopeMatches(userScopi, cat.scopoScrittura)) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_AUTORIZZATO, errMsg: 'Non hai permessi di scrittura per questa categoria'});
      }

      const chiavi = Array.isArray(inputs.chiavi) ? inputs.chiavi : [inputs.chiavi];
      const risultati = [];

      for (const chiave of chiavi) {
        const existing = await Anagrafica_MpiExtraDataValori.findOne({
          mpiRecord: record.id, categoria: cat.id, chiave
        });

        if (existing) {
          await Anagrafica_MpiExtraDataStorico.create({
            valore: existing.id, vecchioValore: existing.valore, nuovoValore: null,
            operazione: 'DELETE', utente: username, ipAddress
          });
          await Anagrafica_MpiExtraDataValori.destroyOne({id: existing.id});
          risultati.push({chiave, operazione: 'DELETE'});
        }
      }

      return res.ApiResponse({data: {mpiId: inputs.mpiId, categoria: cat.codice, risultati}});
    } catch (err) {
      sails.log.error('Errore MPI extra-data delete:', err);
      return res.ApiResponse({errType: ERROR_TYPES.ERRORE_DEL_SERVER, errMsg: 'Errore durante l\'eliminazione dati extra'});
    }
  }
};
