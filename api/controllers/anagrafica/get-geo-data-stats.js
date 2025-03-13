/**
 * @swagger
 *
 * /get-geo-data-stats:
 *   tags:
 *     - Anagrafica
 */

const VerificaQuartieri = require('../../services/VerificaQuartieri');
const {ERROR_TYPES} = require('../../responses/ApiResponse');

module.exports = {
  friendlyName: 'Statistiche per comune di residenza',
  description: 'Ottieni i dati geografici degli assistiti per comune di residenza, opzionalmente è possibile ottenere i dati per Quartiere (o circoscrizione) fornendo un json con una mappa cap <-> quartiere',
  inputs: {
    // codComuneResidenza
    codComuneResidenza: {
      type: 'string',
      required: true,
      description: 'Codice del comune di residenza'
    },
    soloInVita: {
      type: 'boolean',
      description: 'Se true, ritorna solo gli assistiti in vita',
      defaultsTo: true
    },
    jsonMap: {
      type: 'json',
      required: false,
      description: 'Json con la mappa cap <-> quartiere (opzionale)',
      example: {
        'jsonMap': {
          '<cap1>': {
            'lat': 'x.xxxxxxxx',
            'long': 'y.xxxxxxxx',
            'circoscrizione': 'y'
          },
          '<cap2>': {
            'lat': 'x.xxxxxxxx',
            'long': 'y.xxxxxxxx',
            'circoscrizione': 'x'
          },
        }
      },
      custom: function (value) {
        // Verifica che l'oggetto abbia la struttura corretta
        let parsed = JSON.parse(value);
        return _.isObject(parsed) && !_.isArray(parsed);
      },
    },
  },
  exits: {},

  fn: async function (inputs) {
    const res = this.res;
    const verificatore = new VerificaQuartieri('circoscrizioni-messina-2021.geojson');
    let inVita = {};
    if (inputs.soloInVita) {
      inVita = {
        dataDecesso: null
      };
    }
    let data = await Anagrafica_Assistiti.find({
      where: {
        codComuneResidenza: inputs.codComuneResidenza,
        ...inVita
      },
      select: ['capResidenza', 'indirizzoResidenza', 'lat', 'long'],
    });
    let result = {totale: 0, perQuartiere: {}};
    if (inputs.jsonMap) {
      let jsonMap = JSON.parse(inputs.jsonMap);
      for (let assistito of data) {
        let cap = null;
        let quartiere = null;
        if (assistito.indirizzoResidenza) {
          try {
            cap = assistito.indirizzoResidenza.split(',')[1].trim().split(' ')[0];
            if (cap.length !== 5 || cap === '98100') {
              throw new Error('Cap non valido');
            }
            quartiere = jsonMap.hasOwnProperty(cap) ? jsonMap[cap].circoscrizione : 'ALTRO';
          } catch (e) {
            if (assistito.lat) {
              quartiere = verificatore.verificaPuntoMappa(assistito.lat, assistito.long);
            }
          }
          if (!quartiere) {
            quartiere = 'ALTRO';
          }
          if (!result.perQuartiere[quartiere]) {
            result.perQuartiere[quartiere] = 0;
          }
          result.perQuartiere[quartiere]++;
          result.totale++;
        }
      }
      return res.ApiResponse({
        data: result
      });
    }
  }
}
