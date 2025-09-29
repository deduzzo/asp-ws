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
      type: 'string',
      required: true,
      isIn: ['P', 'M'],
      description: 'Tipo di medico: "M" per medico di base, "P" per pediatra'
    }
  },


  exits: {

  },


  fn: async function (inputs) {

    // All done.
    return;

  }


};
