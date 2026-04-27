/**
 * @swagger
 *
 * /get-categorie-cittadino:
 *   tags:
 *     - Cambio Medico
 */
const MediciService = require('../../services/MediciService');
const ApiResponse = require('../../responses/ApiResponse');

module.exports = {

  friendlyName: 'Get categorie cittadino per situazione assistenziale',

  description: 'Restituisce le categorie cittadino (sc_id) ammesse per una specifica situazione assistenziale (sa_id). Endpoint NAR2 /getSCIDBySAID/{sa_id}.',

  inputs: {
    saId: {
      type: 'string',
      required: true,
      description: 'sa_id situazione assistenziale'
    }
  },

  exits: {},

  fn: async function (inputs) {
    try {
      const result = await MediciService.getCategorieCittadinoBySituazione(inputs.saId);
      if (result && result.ok) {
        return this.res.ApiResponse({data: result.data});
      }
      return this.res.ApiResponse({errType: ApiResponse.ERROR_TYPES.NOT_FOUND, errMsg: 'Categorie cittadino non disponibili'});
    } catch (err) {
      sails.log.error('[cambio-medico/get-categorie-cittadino] Eccezione:', err);
      return this.res.ApiResponse({errType: ApiResponse.ERROR_TYPES.ERRORE_DEL_SERVER, errMsg: 'Errore interno'});
    }
  }
};
