/**
 * @swagger
 *
 * /get-medici-disponibili-assistito:
 *   tags:
 *     - Cambio Medico
 */

module.exports = {


  friendlyName: 'Get medici disponibili assistito',


  description: 'Ottiene la lista dei medici disponibili per un assistito specifico.',


  inputs: {
    cfAssistito: {
      type: 'string',
      required: true,
      description: 'Codice fiscale dell\'assistito'
    },
    tipoMedico: {

  },


  exits: {

  },


  fn: async function (inputs) {

    // All done.
    return;

  }


};
