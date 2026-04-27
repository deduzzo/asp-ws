/**
 * @swagger
 *
 * /get-situazioni-ammesse:
 *   tags:
 *     - Cambio Medico
 */
const MediciService = require('../../services/MediciService');
const ApiResponse = require('../../responses/ApiResponse');

module.exports = {

  friendlyName: 'Get situazioni assistenziali ammesse per cambio medico',

  description: 'Restituisce le situazioni assistenziali AMMESSE per la scelta del medico (endpoint NAR2 /getOnlySitAss). Diverso da get-situazioni-assistenziali-assistito che restituisce lo storico. Da usare per il flusso di submit cambio medico.',

  inputs: {
    cfAssistito: {
      type: 'string',
      required: true,
      description: 'Codice fiscale dell\'assistito'
    },
    tipoMedico: {
      type: 'string',
      isIn: ['M', 'P'],
      defaultsTo: 'M',
      description: 'M = MMG, P = Pediatra'
    },
    pmId: {
      type: 'string',
      description: 'pm_id corrente (opzionale, default null per nuova scelta)'
    }
  },

  exits: {},

  fn: async function (inputs) {
    try {
      const config = {tipoMedico: inputs.tipoMedico};
      if (inputs.pmId) {config.pmId = inputs.pmId;}
      const result = await MediciService.getSituazioniAssistenzialiAmmesse(inputs.cfAssistito, config);
      if (result && result.ok) {
        return this.res.ApiResponse({data: result.data});
      }
      return this.res.ApiResponse({errType: ApiResponse.ERROR_TYPES.NOT_FOUND, errMsg: 'Situazioni assistenziali non disponibili'});
    } catch (err) {
      sails.log.error('[cambio-medico/get-situazioni-ammesse] Eccezione:', err);
      return this.res.ApiResponse({errType: ApiResponse.ERROR_TYPES.ERRORE_DEL_SERVER, errMsg: 'Errore interno'});
    }
  }
};
