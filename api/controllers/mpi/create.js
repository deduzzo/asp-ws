/**
 * @swagger
 *
 * /create:
 *   tags:
 *     - MPI
 * tags:
 *   - name: MPI
 *     description: Master Patient Index. Gestione pazienti sconosciuti con collegamento all'anagrafica reale
 */

const {ERROR_TYPES} = require('../../responses/ApiResponse');
const crypto = require('crypto');

module.exports = {
  friendlyName: 'MPI Create',
  description: 'Crea un nuovo record MPI. Tutti i campi sono opzionali: può essere creato anche vuoto (solo UUID).',

  inputs: {
    applicazione: {
      type: 'string',
      description: 'Codice applicazione (obbligatorio se l\'utente ha scopi per più app)'
    },
    idEsterno: {
      type: 'string',
      description: 'ID esterno dell\'app (es. codice braccialetto)'
    },
    cf: {type: 'string'},
    cognome: {type: 'string'},
    nome: {type: 'string'},
    sesso: {type: 'string'},
    dataNascita: {type: 'number'},
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
    ssnInizioAssistenza: {type: 'number'},
    ssnFineAssistenza: {type: 'number'},
    ssnMotivazioneFineAssistenza: {type: 'string'},
    ssnNumeroTessera: {type: 'string'},
    dataDecesso: {type: 'number'},
    note: {type: 'string'},
  },

  fn: async function (inputs, exits) {
    const req = this.req;
    const res = this.res;

    try {
      const userScopi = req.tokenData.scopi;
      const username = req.tokenData.username;

      // Risolvi l'app MPI dall'utente
      let app;
      try {
        app = await sails.helpers.resolveMpiAppFromScopes.with({
          userScopi,
          applicazioneCodice: inputs.applicazione || null
        });
      } catch (e) {
        if (e === 'notFound') {
          return res.ApiResponse({
            errType: ERROR_TYPES.NON_AUTORIZZATO,
            errMsg: 'Nessuna applicazione MPI associata ai tuoi permessi'
          });
        }
        if (e.raw) {
          return res.ApiResponse({
            errType: ERROR_TYPES.ERRORE_GENERICO,
            errMsg: `Hai accesso a più applicazioni MPI (${e.raw.join(', ')}). Specifica il campo 'applicazione'.`
          });
        }
        throw e;
      }

      // Genera UUID
      const mpiId = crypto.randomUUID();

      // Prepara dati record
      const recordData = {
        mpiId,
        applicazione: app.id,
        idEsterno: inputs.idEsterno || null,
        stato: 'aperto',
      };

      // Campi demografici (solo se forniti)
      const campiDemografici = [
        'cf', 'cognome', 'nome', 'sesso', 'dataNascita',
        'comuneNascita', 'codComuneNascita', 'codIstatComuneNascita', 'provinciaNascita',
        'indirizzoResidenza', 'capResidenza', 'comuneResidenza', 'codComuneResidenza', 'codIstatComuneResidenza',
        'asp', 'ssnTipoAssistito', 'ssnInizioAssistenza', 'ssnFineAssistenza',
        'ssnMotivazioneFineAssistenza', 'ssnNumeroTessera', 'dataDecesso', 'note'
      ];

      for (const campo of campiDemografici) {
        if (inputs[campo] !== undefined) {
          recordData[campo] = inputs[campo];
        }
      }

      // Auto-link se CF fornito
      let assistitoLinked = null;
      if (inputs.cf) {
        const assistito = await Anagrafica_Assistiti.findOne({cf: inputs.cf});
        if (assistito) {
          recordData.assistito = assistito.id;
          recordData.stato = 'identificato';
          recordData.dataIdentificazione = Date.now();
          recordData.utenteIdentificazione = username;
          assistitoLinked = {cf: assistito.cf, nome: assistito.nome, cognome: assistito.cognome};
        }
      }

      const record = await Anagrafica_MpiRecord.create(recordData).fetch();

      // Storico
      await Anagrafica_MpiRecordStorico.create({
        mpiRecord: record.id,
        operazione: 'CREATE',
        dettaglio: {mpiId, applicazione: app.codice, idEsterno: inputs.idEsterno || null, autoLinked: !!assistitoLinked},
        utente: username,
        ipAddress: req.ip,
      });

      await sails.helpers.log.with({
        level: 'info',
        tag: 'MPI_CREATE',
        message: `Record MPI creato: ${mpiId} (app: ${app.codice})`,
        action: 'mpi-create',
        ipAddress: req.ip,
        user: username,
        context: {mpiId, appCodice: app.codice, stato: recordData.stato}
      });

      return res.ApiResponse({
        data: {
          mpiId,
          stato: recordData.stato,
          applicazione: app.codice,
          idEsterno: inputs.idEsterno || null,
          assistito: assistitoLinked
        }
      });
    } catch (err) {
      sails.log.error('Errore MPI create:', err);
      return res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: 'Errore durante la creazione del record MPI'
      });
    }
  }
};
