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
    preferisciCap: {
      type: 'boolean',
      description: 'Se true, preferisci il cap per la ricerca del quartiere',
      defaultsTo: true
    },
    jsonMap: {
      type: 'json',
      required: false,
      description: 'Json con la mappa cap <-> quartiere (opzionale)',
      example: {
        'jsonMap': {
          '98121': {
            'lat': '38.207365358536585',
            'long': '15.55313112926829',
            'circoscrizione': '5'
          },
          '98122': {
            'lat': '38.18828453795181',
            'long': '15.555627916265061',
            'circoscrizione': '4'
          },
          '98123': {
            'lat': '38.18443621308226',
            'long': '15.553023825123885',
            'circoscrizione': '4'
          },
          '98124': {
            'lat': '38.174988171244635',
            'long': '15.546306565665237',
            'circoscrizione': '3'
          },
          '98125': {
            'lat': '38.16124343703704',
            'long': '15.532582418518519',
            'circoscrizione': '2'
          },
          '98126': {
            'lat': '38.15338773333333',
            'long': '15.5160938',
            'circoscrizione': '2'
          },
          '98127': {
            'lat': '38.17274164285714',
            'long': '15.525965342857143',
            'circoscrizione': '2'
          },
          '98128': {
            'lat': '38.1377291',
            'long': '15.5242255',
            'circoscrizione': '1'
          },
          '98129': {
            'lat': '38.1372405',
            'long': '15.501302',
            'circoscrizione': '1'
          },
          '98131': {
            'lat': '38.10845058666667',
            'long': '15.510051097777778',
            'circoscrizione': '1'
          },
          '98132': {
            'lat': '38.1205594',
            'long': '15.5070861',
            'circoscrizione': '1'
          },
          '98134': {
            'lat': '38.11035843636364',
            'long': '15.51100408181818',
            'circoscrizione': '1'
          },
          '98135': {
            'lat': '38.12417886666667',
            'long': '15.513203333333335',
            'circoscrizione': '1'
          },
          '98136': {
            'lat': '38.099476',
            'long': '15.4954635',
            'circoscrizione': '1'
          },
          '98139': {
            'lat': '38.0828279',
            'long': '15.4669154',
            'circoscrizione': '1'
          },
          '98141': {
            'lat': '38.0626315',
            'long': '15.4709168',
            'circoscrizione': '1'
          },
          '98142': {
            'lat': '38.068391',
            'long': '15.4506603',
            'circoscrizione': '1'
          },
          '98143': {
            'lat': '38.0753614',
            'long': '15.4224578',
            'circoscrizione': '1'
          },
          '98144': {
            'lat': '38.1587149',
            'long': '15.4713254',
            'circoscrizione': '2'
          },
          '98145': {
            'lat': '38.1818619',
            'long': '15.5283066',
            'circoscrizione': '3'
          },
          '98146': {
            'lat': '38.17558',
            'long': '15.4914322',
            'circoscrizione': '3'
          },
          '98147': {
            'lat': '38.17080563553299',
            'long': '15.527890017766497',
            'circoscrizione': '3'
          },
          '98148': {
            'lat': '38.17428556857143',
            'long': '15.528075794285714',
            'circoscrizione': '3'
          },
          '98149': {
            'lat': '38.1861594',
            'long': '15.5331524',
            'circoscrizione': '3'
          },
          '98151': {
            'lat': '38.1900944',
            'long': '15.4996093',
            'circoscrizione': '3'
          },
          '98152': {
            'lat': '38.2175104',
            'long': '15.5004589',
            'circoscrizione': '4'
          },
          '98153': {
            'lat': '38.2364187',
            'long': '15.467781',
            'circoscrizione': '6'
          },
          '98154': {
            'lat': '38.2398459',
            'long': '15.4964843',
            'circoscrizione': '6'
          },
          '98155': {
            'lat': '38.2633098',
            'long': '15.521498',
            'circoscrizione': '6'
          },
          '98156': {
            'lat': '38.2740091',
            'long': '15.5345906',
            'circoscrizione': '6'
          },
          '98157': {
            'lat': '38.2721171',
            'long': '15.5543514',
            'circoscrizione': '6'
          },
          '98158': {
            'lat': '38.26275231428571',
            'long': '15.58337182857143',
            'circoscrizione': '6'
          },
          '98161': {
            'lat': '38.2585538',
            'long': '15.4513609',
            'circoscrizione': '6'
          },
          '98162': {
            'lat': '38.28568425',
            'long': '15.5025915',
            'circoscrizione': '6'
          },
          '98163': {
            'lat': '38.2871092',
            'long': '15.56221615',
            'circoscrizione': '6'
          },
          '98164': {
            'lat': '38.26403274',
            'long': '15.6363112',
            'circoscrizione': '6'
          },
          '98165': {
            'lat': '38.2643444',
            'long': '15.60873945',
            'circoscrizione': '6'
          },
          '98166': {
            'lat': '38.2540341',
            'long': '15.59930385',
            'circoscrizione': '6'
          },
          '98167': {
            'lat': '38.2461153',
            'long': '15.5818379',
            'circoscrizione': '6'
          },
          '98168': {
            'lat': '38.2297134',
            'long': '15.5298319',
            'circoscrizione': '5'
          }
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
        let capIndirizzo = null;
        let quartiereCoordinate = null;
        let quartiereCap = null;
        let quartiere = null;
        try {
          capIndirizzo = assistito.indirizzoResidenza.split(',')[1].trim().split(' ')[0].trim();
        } catch (ex) {
        }
        try {
          if (assistito.lat) {
            quartiereCoordinate = verificatore.verificaPuntoMappa(assistito.lat, assistito.long);
          }
        } catch (e) {
          // procediamo con la verifica per cap
        }
        if (capIndirizzo && capIndirizzo !== '98100' && capIndirizzo.length === 5) {
          cap = capIndirizzo;
        } else if (assistito.capResidenza && assistito.capResidenza.length === 5 && assistito.capResidenza !== '98100') {
          cap = assistito.capResidenza;
        }
        if (cap) {
          quartiereCap = jsonMap.hasOwnProperty(cap) ? jsonMap[cap].circoscrizione : null;
        }
        if (!inputs.preferisciCap) {
          quartiere = quartiereCoordinate;
        }
        if (!quartiere && quartiereCap !== null) {
          quartiere = quartiereCap;
        }
        if (!quartiere) {
          quartiere = 'N/D';
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
};
