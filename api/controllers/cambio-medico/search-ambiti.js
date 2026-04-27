/**
 * @swagger
 *
 * /search-ambiti:
 *   tags:
 *     - Cambio Medico
 */
const MediciService = require('../../services/MediciService');
const ApiResponse = require('../../responses/ApiResponse');

module.exports = {

  friendlyName: 'Ricerca ambiti via autocomplete',

  description: 'Ricerca ambiti via NAR2 /ambitoDomScelta autocomplete. Per UI con typeahead.',

  inputs: {
    searchKey: {
      type: 'string',
      required: true,
      description: 'Stringa di ricerca (es. "mess")'
    },
    azienda: {
      type: 'string',
      description: 'Codice azienda/comune (es. pz_com_res)'
    },
    tipo: {
      type: 'string',
      description: 'Tipo struttura (default 90000000038 = Ambito MMG, 90000000040 = Distretto)'
    }
  },

  exits: {},

  fn: async function (inputs) {
    try {
      const config = {};
      if (inputs.azienda) {config.azienda = inputs.azienda;}
      if (inputs.tipo) {config.tipo = inputs.tipo;}
      const result = await MediciService.searchAmbitiAutocomplete(inputs.searchKey, config);
      if (result && result.ok) {
        return this.res.ApiResponse({data: result.data});
      }
      return this.res.ApiResponse({errType: ApiResponse.ERROR_TYPES.NOT_FOUND, errMsg: 'Nessun ambito trovato'});
    } catch (err) {
      sails.log.error('[cambio-medico/search-ambiti] Eccezione:', err);
      return this.res.ApiResponse({errType: ApiResponse.ERROR_TYPES.ERRORE_DEL_SERVER, errMsg: 'Errore interno'});
    }
  }
};
