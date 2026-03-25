/**
 * @swagger
 *
 * /ricerca:
 *   tags:
 *     - MPI
 */

const {ERROR_TYPES} = require('../../responses/ApiResponse');

module.exports = {
  friendlyName: 'MPI Ricerca',
  description: 'Ricerca cross-app nei record MPI. Richiede scope mpi-search.',

  inputs: {
    cf: {type: 'string'},
    nome: {type: 'string'},
    cognome: {type: 'string'},
    dataNascita: {type: 'number'},
    idEsterno: {type: 'string'},
    mpiId: {type: 'string'},
    stato: {type: 'string', isIn: ['aperto', 'identificato', 'annullato']},
    applicazione: {type: 'string', description: 'Codice applicazione (filtra per app)'},
    limit: {type: 'number', defaultsTo: 100, max: 500},
  },

  fn: async function (inputs, exits) {
    const req = this.req;
    const res = this.res;

    try {
      if (!await sails.helpers.scopeMatches(req.tokenData.scopi, 'mpi-search')) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_AUTORIZZATO, errMsg: 'Scope mpi-search richiesto'});
      }

      // Costruisci criteria
      const criteria = {};

      if (inputs.mpiId) {
        criteria.mpiId = inputs.mpiId;
      }
      if (inputs.cf) {
        criteria.cf = {contains: inputs.cf.toUpperCase()};
      }
      if (inputs.nome) {
        criteria.nome = {contains: inputs.nome};
      }
      if (inputs.cognome) {
        criteria.cognome = {contains: inputs.cognome};
      }
      if (inputs.dataNascita) {
        criteria.dataNascita = inputs.dataNascita;
      }
      if (inputs.idEsterno) {
        criteria.idEsterno = inputs.idEsterno;
      }
      if (inputs.stato) {
        criteria.stato = inputs.stato;
      }

      // Filtra per applicazione se specificata
      if (inputs.applicazione) {
        const app = await Anagrafica_MpiApplicazioni.findOne({codice: inputs.applicazione.toUpperCase()});
        if (app) {
          criteria.applicazione = app.id;
        } else {
          return res.ApiResponse({data: []});
        }
      }

      // Almeno un criterio
      if (Object.keys(criteria).length === 0) {
        return res.ApiResponse({errType: ERROR_TYPES.ERRORE_GENERICO, errMsg: 'Specificare almeno un criterio di ricerca'});
      }

      const records = await Anagrafica_MpiRecord.find(criteria)
        .populate('applicazione')
        .sort('createdAt DESC')
        .limit(inputs.limit);

      // Mappa risultati (senza dati sensibili interni)
      const results = records.map(r => ({
        mpiId: r.mpiId,
        applicazione: r.applicazione.codice,
        idEsterno: r.idEsterno,
        stato: r.stato,
        cf: r.cf,
        nome: r.nome,
        cognome: r.cognome,
        sesso: r.sesso,
        dataNascita: r.dataNascita,
        createdAt: r.createdAt,
      }));

      return res.ApiResponse({data: results});
    } catch (err) {
      sails.log.error('Errore MPI ricerca:', err);
      return res.ApiResponse({errType: ERROR_TYPES.ERRORE_DEL_SERVER, errMsg: 'Errore durante la ricerca'});
    }
  }
};
