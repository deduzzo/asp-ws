/**
 * @swagger
 *
 * /get-by-assistito:
 *   tags:
 *     - MPI
 */

const {ERROR_TYPES} = require('../../responses/ApiResponse');

module.exports = {
  friendlyName: 'MPI Get by Assistito',
  description: 'Recupera tutti i record MPI collegati a un assistito (per CF).',

  inputs: {
    cf: {type: 'string', required: true, description: 'Codice fiscale dell\'assistito'},
  },

  fn: async function (inputs, exits) {
    const req = this.req;
    const res = this.res;

    try {
      if (!await sails.helpers.scopeMatches(req.tokenData.scopi, 'mpi-search')) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_AUTORIZZATO, errMsg: 'Scope mpi-search richiesto'});
      }

      const assistito = await Anagrafica_Assistiti.findOne({cf: inputs.cf.toUpperCase()});
      if (!assistito) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_TROVATO, errMsg: 'Assistito non trovato'});
      }

      const records = await Anagrafica_MpiRecord.find({assistito: assistito.id})
        .populate('applicazione')
        .sort('createdAt DESC');

      const results = records.map(r => ({
        mpiId: r.mpiId,
        applicazione: r.applicazione.codice,
        idEsterno: r.idEsterno,
        stato: r.stato,
        createdAt: r.createdAt,
        dataIdentificazione: r.dataIdentificazione,
        utenteIdentificazione: r.utenteIdentificazione,
      }));

      return res.ApiResponse({
        data: {
          assistito: {cf: assistito.cf, nome: assistito.nome, cognome: assistito.cognome},
          records: results
        }
      });
    } catch (err) {
      sails.log.error('Errore MPI get-by-assistito:', err);
      return res.ApiResponse({errType: ERROR_TYPES.ERRORE_DEL_SERVER, errMsg: 'Errore durante il recupero'});
    }
  }
};
