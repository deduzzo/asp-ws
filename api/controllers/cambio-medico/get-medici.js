const MediciService = require('../../services/MediciService');
const {ERROR_TYPES} = require('../../responses/ApiResponse');

/**
 * @swagger
 *
 * /get-medici:
 *   tags:
 *     - Cambio Medico
 * tags:
 *   - name: Cambio Medico
 *     description: Servizi per il cambio del medico
 */

module.exports = {

  friendlyName: 'Get medici',

  description: 'Recupera l\'elenco dei medici da NAR2 filtrando per tipologia (MMG o PLS).',

  inputs: {
    tipoMedico: {
      type: 'string',
      required: true,
      isIn: ["TUTTI",'MMG', 'PLS'],
      description: 'Tipo di medico (MMG o PLS o entrambi)'
    },
    soloAttivi: {
      type: 'boolean',
      required: false,
      description: 'Se true, restituisce solo i medici attivi',
      defaultsTo: true
    },
    nascondiCessati: {
      type: 'boolean',
      required: false,
      description: 'Se true, esclude i medici cessati',
      defaultsTo: true
    },
    addSituazioneMedico: {
      type: 'boolean',
      required: false,
      description: 'Se true, aggiunge la situazione del medico (dettaglio carico, assistiti, deroghe)',
      defaultsTo: false
    }
  },

  exits: {},

  fn: async function (inputs) {
    const res = this.res;
    try {
      const tipoArray = [inputs.tipoMedico];
      let config = {
        soloAttivi: true,
        nascondiCessati: true,
        addSituazioneMedico: inputs.addSituazioneMedico
      };
      if (inputs.tipoMedico !== 'TUTTI') {
        config.tipoMedico = tipoArray;
      }
      const result = await MediciService.getMedici(config);

      // Normalizza l'output dal service
      let medici;
      if (result && result.ok === true) {
        medici = Array.isArray(result.data) ? result.data : [];
      } else if (Array.isArray(result)) {
        medici = result;
      } else {
        medici = [];
      }

      if (!medici || medici.length === 0) {
        return res.ApiResponse({
          errType: ERROR_TYPES.NOT_FOUND,
          errMsg: 'Nessun medico trovato'
        });
      }

      return res.ApiResponse({
        data: {
          totalCount: medici.length,
          medici
        }
      });
    } catch (err) {
      return res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: err.message
      });
    }
  }
};
