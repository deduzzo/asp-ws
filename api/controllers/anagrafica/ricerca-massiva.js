/**
 * @swagger
 *
 * /ricerca-massiva:
 *   tags:
 *     - Anagrafica
 */


const {ERROR_TYPES} = require('../../responses/ApiResponse');


module.exports = {

  friendlyName: 'Ricerca Assistito su database locale',

  description:
    'Ricerca assistito tramite parametri. Restituisce un array di assistiti ed altre informazioni.<br />' +
    'Non ci sono limiti di dimensione di dati restituiti<br />',

  inputs: {
    beforeLastUpdate: {
      type: 'number',
      required: false,
      description: 'Restituisce solo gli assistiti con max(updatedAt o lastCheck) inferiore a questo timestamp'
    },
  },
  exits: {},
  fn: async function (inputs, exits) {
    const res = this.res;
    // Verifica che sia stato fornito almeno un parametro di ricerca
    if (!inputs.codiceFiscale && !inputs.nome && !inputs.cognome && !inputs.dataNascita) {
      return res.ApiResponse({
        errType: ERROR_TYPES.BAD_REQUEST,
        errMsg: 'Inserire almeno un parametro di ricerca'
      });
    }

    // Inizializza i criteri di ricerca
    let criteria = {};

    // bisogna restituire solo gli assistiti che hanno entrambi i valori di updatedAt elastCheck minori di beforeLastUpdate
    if (inputs.beforeLastUpdate) {
      criteria = {
        and: [
          {updatedAt: {'<': inputs.beforeLastUpdate}},
          {lastCheck: {'<': inputs.beforeLastUpdate}}
        ]
      };
    }
    // Esegui la ricerca sul modello Anagrafica_Assistiti utilizzando i criteri costruiti
    try {
      let assistiti = await Anagrafica_Assistiti.find({
        where: criteria
      });
      if (assistiti.length === 0) {
        return res.ApiResponse({
          errType: ERROR_TYPES.NOT_FOUND,
          errMsg: 'Nessun assistito trovato'
        });
      }
      return res.ApiResponse({
        data: {
          count: assistiti.length,
          assistiti
        }
      });
    } catch (err) {
      // Propaga l'errore (che verrà gestito dai rispettivi responseType)
      return res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: err.message
      });
    }
  }
};
