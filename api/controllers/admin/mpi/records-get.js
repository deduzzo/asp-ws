const {ERROR_TYPES} = require('../../../responses/ApiResponse');

module.exports = {
  friendlyName: 'Admin MPI Record Get',
  description: 'Dettaglio record MPI dal pannello admin (no scope check).',
  swagger: false,
  inputs: {
    mpiId: {type: 'string', required: true},
  },
  fn: async function (inputs, exits) {
    var res = this.res;
    try {
      var record = await Anagrafica_MpiRecord.findOne({mpiId: inputs.mpiId})
        .populate('applicazione');

      if (!record) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_TROVATO, errMsg: 'Record MPI non trovato'});
      }

      var demograficiMpi = {
        cf: record.cf, cognome: record.cognome, nome: record.nome, sesso: record.sesso,
        dataNascita: record.dataNascita, comuneNascita: record.comuneNascita,
        codComuneNascita: record.codComuneNascita, codIstatComuneNascita: record.codIstatComuneNascita,
        provinciaNascita: record.provinciaNascita, indirizzoResidenza: record.indirizzoResidenza,
        capResidenza: record.capResidenza, comuneResidenza: record.comuneResidenza,
        codComuneResidenza: record.codComuneResidenza, codIstatComuneResidenza: record.codIstatComuneResidenza,
        asp: record.asp, ssnTipoAssistito: record.ssnTipoAssistito,
        ssnInizioAssistenza: record.ssnInizioAssistenza, ssnFineAssistenza: record.ssnFineAssistenza,
        ssnMotivazioneFineAssistenza: record.ssnMotivazioneFineAssistenza,
        ssnNumeroTessera: record.ssnNumeroTessera, dataDecesso: record.dataDecesso, note: record.note
      };

      var demografici = Object.assign({}, demograficiMpi);
      var assistitoData = null;

      // Se identificato, sovrapponi i dati dall'anagrafica reale
      if (record.assistito) {
        var assistito = await Anagrafica_Assistiti.findOne({id: record.assistito});
        if (assistito) {
          assistitoData = {
            cf: assistito.cf,
            cognome: assistito.cognome,
            nome: assistito.nome,
            dataIdentificazione: record.dataIdentificazione,
            utenteIdentificazione: record.utenteIdentificazione
          };
          // Sovrascrivi demografici con dati anagrafica reale dove disponibili
          var campiSovrascrivibili = ['cf', 'cognome', 'nome', 'sesso', 'dataNascita',
            'comuneNascita', 'provinciaNascita', 'indirizzoResidenza', 'capResidenza', 'comuneResidenza'];
          for (var i = 0; i < campiSovrascrivibili.length; i++) {
            var c = campiSovrascrivibili[i];
            if (assistito[c] !== undefined && assistito[c] !== null) {
              demografici[c] = assistito[c];
            }
          }
        }
      }

      return res.ApiResponse({
        data: {
          mpiId: record.mpiId,
          codice: record.codice,
          applicazione: record.applicazione ? record.applicazione.codice : '-',
          idEsterno: record.idEsterno,
          stato: record.stato,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          assistito: assistitoData,
          demografici: demografici,
          demograficiMpi: demograficiMpi
        }
      });
    } catch (err) {
      sails.log.error('Error admin MPI record get:', err);
      return res.ApiResponse({errType: ERROR_TYPES.ERRORE_DEL_SERVER, errMsg: 'Errore nel caricamento del record'});
    }
  }
};
