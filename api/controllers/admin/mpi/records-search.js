const {ERROR_TYPES} = require('../../../responses/ApiResponse');

module.exports = {
  friendlyName: 'Admin MPI Records Search',
  description: 'Ricerca record MPI dal pannello admin (no scope check).',
  swagger: false,
  inputs: {
    id: {type: 'number'},
    cf: {type: 'string'},
    nome: {type: 'string'},
    cognome: {type: 'string'},
    dataNascita: {type: 'number'},
    idEsterno: {type: 'string'},
    mpiId: {type: 'string'},
    codice: {type: 'string'},
    stato: {type: 'string', isIn: ['aperto', 'identificato', 'annullato']},
    applicazione: {type: 'string', description: 'Codice applicazione'},
    limit: {type: 'number', defaultsTo: 100, max: 500},
  },
  fn: async function (inputs, exits) {
    var res = this.res;
    try {
      var criteria = {};

      if (inputs.id) criteria.id = inputs.id;
      if (inputs.mpiId) criteria.mpiId = inputs.mpiId;
      if (inputs.codice) criteria.codice = inputs.codice.toUpperCase();
      if (inputs.cf) criteria.cf = {contains: inputs.cf.toUpperCase()};
      if (inputs.nome) criteria.nome = {contains: inputs.nome};
      if (inputs.cognome) criteria.cognome = {contains: inputs.cognome};
      if (inputs.dataNascita) criteria.dataNascita = inputs.dataNascita;
      if (inputs.idEsterno) criteria.idEsterno = inputs.idEsterno;
      if (inputs.stato) criteria.stato = inputs.stato;

      if (inputs.applicazione) {
        var app = await Anagrafica_MpiApplicazioni.findOne({codice: inputs.applicazione.toUpperCase()});
        if (app) {
          criteria.applicazione = app.id;
        } else {
          return res.ApiResponse({data: []});
        }
      }

      if (Object.keys(criteria).length === 0) {
        criteria.stato = 'aperto';
      }

      var records = await Anagrafica_MpiRecord.find(criteria)
        .populate('applicazione')
        .sort('createdAt DESC')
        .limit(inputs.limit);

      var results = records.map(function(r) {
        return {
          id: r.id,
          codice: r.codice,
          mpiId: r.mpiId,
          applicazione: r.applicazione ? r.applicazione.codice : '-',
          idEsterno: r.idEsterno,
          stato: r.stato,
          cf: r.cf,
          nome: r.nome,
          cognome: r.cognome,
          sesso: r.sesso,
          dataNascita: r.dataNascita,
          createdAt: r.createdAt,
        };
      });

      return res.ApiResponse({data: results});
    } catch (err) {
      sails.log.error('Error admin MPI records search:', err);
      return res.ApiResponse({errType: ERROR_TYPES.ERRORE_DEL_SERVER, errMsg: 'Errore durante la ricerca'});
    }
  }
};
