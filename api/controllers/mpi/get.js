/**
 * @swagger
 *
 * /get:
 *   tags:
 *     - MPI
 */

const {ERROR_TYPES} = require('../../responses/ApiResponse');

module.exports = {
  friendlyName: 'MPI Get',
  description: 'Recupera un record MPI per UUID. Se identificato, i campi dell\'anagrafica reale hanno priorità.',

  inputs: {
    mpiId: {
      type: 'string',
      required: true,
      description: 'UUID del record MPI'
    }
  },

  fn: async function (inputs, exits) {
    const req = this.req;
    const res = this.res;

    try {
      const record = await Anagrafica_MpiRecord.findOne({mpiId: inputs.mpiId})
        .populate('applicazione');

      if (!record) {
        return res.ApiResponse({
          errType: ERROR_TYPES.NON_TROVATO,
          errMsg: 'Record MPI non trovato'
        });
      }

      // Verifica permessi: l'utente deve avere scope per questa app o mpi-search
      const userScopi = req.tokenData.scopi;
      const appCodice = record.applicazione.codice.toLowerCase();
      const hasReadScope = await sails.helpers.scopeMatches(userScopi, `mpi-${appCodice}-read`);
      const hasSearchScope = await sails.helpers.scopeMatches(userScopi, 'mpi-search');

      if (!hasReadScope && !hasSearchScope) {
        return res.ApiResponse({
          errType: ERROR_TYPES.NON_AUTORIZZATO,
          errMsg: 'Non hai i permessi per accedere a questo record MPI'
        });
      }

      // Se identificato, merge con dati assistito (priorità anagrafica reale)
      let assistitoData = null;
      if (record.stato === 'identificato' && record.assistito) {
        const assistito = await Anagrafica_Assistiti.findOne({id: record.assistito});
        if (assistito) {
          assistitoData = assistito;
        }
      }

      // Costruisci risposta
      const response = {
        mpiId: record.mpiId,
        applicazione: record.applicazione.codice,
        idEsterno: record.idEsterno,
        stato: record.stato,
        note: record.note,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };

      // Campi demografici: se identificato, priorità assistito
      const campiDemografici = [
        'cf', 'cognome', 'nome', 'sesso', 'dataNascita',
        'comuneNascita', 'codComuneNascita', 'codIstatComuneNascita', 'provinciaNascita',
        'indirizzoResidenza', 'capResidenza', 'comuneResidenza', 'codComuneResidenza', 'codIstatComuneResidenza',
        'asp', 'ssnTipoAssistito', 'ssnInizioAssistenza', 'ssnFineAssistenza',
        'ssnMotivazioneFineAssistenza', 'ssnNumeroTessera', 'dataDecesso'
      ];

      response.demografici = {};
      response.demograficiMpi = {};

      for (const campo of campiDemografici) {
        // Dati MPI originali (sempre presenti come storico)
        if (record[campo] !== null && record[campo] !== undefined) {
          response.demograficiMpi[campo] = record[campo];
        }
        // Dati effettivi: assistito ha priorità
        if (assistitoData && assistitoData[campo] !== null && assistitoData[campo] !== undefined) {
          response.demografici[campo] = assistitoData[campo];
        } else if (record[campo] !== null && record[campo] !== undefined) {
          response.demografici[campo] = record[campo];
        }
      }

      if (assistitoData) {
        response.assistito = {
          cf: assistitoData.cf,
          dataIdentificazione: record.dataIdentificazione,
          utenteIdentificazione: record.utenteIdentificazione
        };
      }

      return res.ApiResponse({data: response});
    } catch (err) {
      sails.log.error('Errore MPI get:', err);
      return res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: 'Errore durante il recupero del record MPI'
      });
    }
  }
};
