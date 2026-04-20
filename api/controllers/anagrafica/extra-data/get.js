/**
 * @swagger
 *
 * /get:
 *   tags:
 *     - Gestione Extra data Assistiti
 * tags:
 *   - name: Gestione Extra data Assistiti
 *     description: Gestione dei dati extra degli assistiti (contatti, documenti, ecc.)
 */

const {ERROR_TYPES} = require('../../../responses/ApiResponse');
module.exports = {
  friendlyName: 'Get extra data assistito',
  description: 'Recupera i dati extra di un assistito tramite codice fiscale, filtrati per scope dell\'utente.',
  inputs: {
    cf: {
      type: 'string',
      required: true,
      description: 'Codice fiscale o STP dell\'assistito'
    }
  },
  fn: async function (inputs, exits) {
    try {
      const userScopi = (this.req.tokenData && this.req.tokenData.scopi) || [];

      const assistito = await Anagrafica_Assistiti.findOne({ cf: inputs.cf.toUpperCase() });
      if (!assistito) {
        return this.res.ApiResponse({
          errType: ERROR_TYPES.NOT_FOUND,
          errMsg: 'Assistito non trovato'
        });
      }

      const extraData = await sails.helpers.getExtraDataForAssistiti.with({
        assistitoIds: [assistito.id],
        userScopi
      });

      return this.res.ApiResponse({
        data: {
          cf: assistito.cf,
          extraData: extraData[assistito.id] || {}
        }
      });
    } catch (error) {
      sails.log.error('Error getting extra data:', error);
      return this.res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: 'Errore durante il recupero dei dati extra'
      });
    }
  }
};
