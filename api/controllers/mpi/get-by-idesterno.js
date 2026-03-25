/**
 * @swagger
 *
 * /get-by-idesterno:
 *   tags:
 *     - MPI
 */

const {ERROR_TYPES} = require('../../responses/ApiResponse');

module.exports = {
  friendlyName: 'MPI Get by ID esterno',
  description: 'Recupera un record MPI per ID esterno dell\'applicazione.',

  inputs: {
    idEsterno: {type: 'string', required: true},
  },

  fn: async function (inputs, exits) {
    const req = this.req;
    const res = this.res;

    try {
      // Risolvi app dall'utente
      let app;
      try {
        app = await sails.helpers.resolveMpiAppFromScopes.with({
          userScopi: req.tokenData.scopi,
          applicazioneCodice: null
        });
      } catch (e) {
        if (e === 'notFound') {
          return res.ApiResponse({errType: ERROR_TYPES.NON_AUTORIZZATO, errMsg: 'Nessuna applicazione MPI associata'});
        }
        // Se ambiguo, cerca in tutte le app dell'utente
        if (e.raw) {
          const records = await Anagrafica_MpiRecord.find({idEsterno: inputs.idEsterno})
            .populate('applicazione');
          const filtered = records.filter(r => e.raw.includes(r.applicazione.codice));
          return res.ApiResponse({data: filtered});
        }
        throw e;
      }

      const record = await Anagrafica_MpiRecord.findOne({
        idEsterno: inputs.idEsterno,
        applicazione: app.id
      }).populate('applicazione');

      if (!record) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_TROVATO, errMsg: 'Record MPI non trovato per questo ID esterno'});
      }

      return res.ApiResponse({data: record});
    } catch (err) {
      sails.log.error('Errore MPI get-by-idesterno:', err);
      return res.ApiResponse({errType: ERROR_TYPES.ERRORE_DEL_SERVER, errMsg: 'Errore durante il recupero'});
    }
  }
};
