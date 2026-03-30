const {ERROR_TYPES} = require('../../../responses/ApiResponse');
const crypto = require('crypto');

module.exports = {
  friendlyName: 'Admin MPI Record Create',
  description: 'Crea un nuovo record MPI dal pannello admin.',
  swagger: false,
  inputs: {
    applicazione: {type: 'number', required: true, description: 'ID applicazione MPI'},
    idEsterno: {type: 'string'},
    cf: {type: 'string'},
    cognome: {type: 'string'},
    nome: {type: 'string'},
    sesso: {type: 'string'},
    dataNascita: {type: 'string', description: 'Data nascita in formato YYYY-MM-DD'},
    comuneNascita: {type: 'string'},
    codComuneNascita: {type: 'string'},
    codIstatComuneNascita: {type: 'string'},
    provinciaNascita: {type: 'string'},
    indirizzoResidenza: {type: 'string'},
    capResidenza: {type: 'string'},
    comuneResidenza: {type: 'string'},
    codComuneResidenza: {type: 'string'},
    codIstatComuneResidenza: {type: 'string'},
    asp: {type: 'string'},
    ssnTipoAssistito: {type: 'string'},
    ssnInizioAssistenza: {type: 'string', description: 'Data in formato YYYY-MM-DD'},
    ssnFineAssistenza: {type: 'string', description: 'Data in formato YYYY-MM-DD'},
    ssnMotivazioneFineAssistenza: {type: 'string'},
    ssnNumeroTessera: {type: 'string'},
    dataDecesso: {type: 'string', description: 'Data in formato YYYY-MM-DD'},
    note: {type: 'string'},
  },
  fn: async function (inputs, exits) {
    var res = this.res;
    var req = this.req;
    try {
      var app = await Anagrafica_MpiApplicazioni.findOne({id: inputs.applicazione});
      if (!app) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_TROVATO, errMsg: 'Applicazione MPI non trovata'});
      }

      var mpiId = crypto.randomUUID();
      var recordData = {
        mpiId: mpiId,
        applicazione: app.id,
        idEsterno: inputs.idEsterno || null,
        stato: 'aperto',
      };

      // Date fields conversion
      var dateFields = {
        dataNascita: inputs.dataNascita,
        ssnInizioAssistenza: inputs.ssnInizioAssistenza,
        ssnFineAssistenza: inputs.ssnFineAssistenza,
        dataDecesso: inputs.dataDecesso
      };
      for (var df in dateFields) {
        if (dateFields[df]) {
          recordData[df] = new Date(dateFields[df]).getTime();
        }
      }

      // String fields
      var stringFields = [
        'cf', 'cognome', 'nome', 'sesso',
        'comuneNascita', 'codComuneNascita', 'codIstatComuneNascita', 'provinciaNascita',
        'indirizzoResidenza', 'capResidenza', 'comuneResidenza', 'codComuneResidenza', 'codIstatComuneResidenza',
        'asp', 'ssnTipoAssistito', 'ssnMotivazioneFineAssistenza', 'ssnNumeroTessera', 'note'
      ];
      for (var i = 0; i < stringFields.length; i++) {
        var campo = stringFields[i];
        if (inputs[campo] !== undefined && inputs[campo] !== '') {
          recordData[campo] = inputs[campo];
        }
      }

      // Auto-link se CF fornito
      var assistitoLinked = null;
      if (recordData.cf) {
        var assistito = await Anagrafica_Assistiti.findOne({cf: recordData.cf});
        if (assistito) {
          recordData.assistito = assistito.id;
          recordData.stato = 'identificato';
          recordData.dataIdentificazione = Date.now();
          recordData.utenteIdentificazione = req.tokenData.username;
          assistitoLinked = {cf: assistito.cf, nome: assistito.nome, cognome: assistito.cognome};
        }
      }

      var record = await Anagrafica_MpiRecord.create(recordData).fetch();

      await Anagrafica_MpiRecordStorico.create({
        mpiRecord: record.id,
        operazione: 'CREATE',
        dettaglio: {mpiId: mpiId, applicazione: app.codice, admin: true, autoLinked: !!assistitoLinked},
        utente: req.tokenData.username,
        ipAddress: req.ip,
      });

      await sails.helpers.log.with({
        level: 'info',
        tag: 'MPI_ADMIN',
        message: 'Record MPI creato da admin: ' + mpiId,
        action: 'admin-mpi-record-create',
        ipAddress: req.ip,
        user: req.tokenData.username,
        context: {mpiId: mpiId, appCodice: app.codice, stato: recordData.stato}
      });

      return res.ApiResponse({
        data: {
          mpiId: mpiId,
          stato: recordData.stato,
          applicazione: app.codice,
          assistito: assistitoLinked
        }
      });
    } catch (err) {
      sails.log.error('Error admin MPI record create:', err);
      return res.ApiResponse({errType: ERROR_TYPES.ERRORE_DEL_SERVER, errMsg: 'Errore durante la creazione del record MPI'});
    }
  }
};
