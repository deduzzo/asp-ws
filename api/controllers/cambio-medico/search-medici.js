/**
 * @swagger
 *
 * /search-medici:
 *   tags:
 *     - Cambio Medico
 */
const MediciService = require('../../services/MediciService');
const ApiResponse = require('../../responses/ApiResponse');

module.exports = {

  friendlyName: 'Ricerca medici per ambito via autocomplete',

  description: 'Ricerca medici per ambito via NAR2 /mediciByAmbito autocomplete. Restituisce dati estesi (CF medico, codice regionale, ENPAM, massimali, rapporto individuale). Per UI con typeahead.',

  inputs: {
    idAmbito: {
      type: 'string',
      required: true,
      description: 'sr_id ambito'
    },
    cfAssistito: {
      type: 'string',
      required: true,
      description: 'Codice fiscale dell\'assistito (per filtri di compatibilità)'
    },
    searchKey: {
      type: 'string',
      required: true,
      description: 'Stringa di ricerca (es. "ros" per cercare "rossi")'
    },
    tipoMedico: {
      type: 'string',
      isIn: ['M', 'P'],
      defaultsTo: 'M',
      description: 'M = MMG, P = Pediatra'
    },
    sitAssistenziale: {
      type: 'number',
      defaultsTo: 4,
      description: 'sa_id situazione assistenziale (default 4 = residente in regione)'
    }
  },

  exits: {},

  fn: async function (inputs) {
    try {
      const config = {
        tipoMedico: inputs.tipoMedico,
        sitAssistenziale: inputs.sitAssistenziale
      };
      const result = await MediciService.searchMediciByAmbitoAutocomplete(inputs.idAmbito, inputs.cfAssistito, inputs.searchKey, config);
      if (result && result.ok) {
        return this.res.ApiResponse({data: result.data});
      }
      return this.res.ApiResponse({errType: ApiResponse.ERROR_TYPES.NOT_FOUND, errMsg: 'Nessun medico trovato'});
    } catch (err) {
      sails.log.error('[cambio-medico/search-medici] Eccezione:', err);
      return this.res.ApiResponse({errType: ApiResponse.ERROR_TYPES.ERRORE_DEL_SERVER, errMsg: 'Errore interno'});
    }
  }
};
