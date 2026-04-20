const MediciService = require('../../services/MediciService');
const {ERROR_TYPES} = require('../../responses/ApiResponse');
const {utils} = require("aziendasanitaria-utils/src/Utils");

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

// Cache in memoria per i risultati delle richieste
const mediciCache = new Map();

// Tempo di scadenza della cache in millisecondi (2 ore)
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * Genera una chiave univoca per la cache basata sui parametri della richiesta
 * @param {Object} params - Parametri della richiesta
 * @returns {string} - Chiave di cache
 */
function generateCacheKey(params) {
  const {tipoMedico, soloAttivi, nascondiCessati, addSituazioneMedico} = params;
  return `medici_${tipoMedico}_${soloAttivi}_${nascondiCessati}_${addSituazioneMedico}`;
}

/**
 * Verifica se una voce della cache è ancora valida
 * @param {Object} cacheEntry - Voce della cache con timestamp
 * @returns {boolean} - True se la cache è ancora valida
 */
function isCacheValid(cacheEntry) {
  if (!cacheEntry) {
    return false;
  }
  const now = Date.now();
  return (now - cacheEntry.timestamp) < CACHE_TTL_MS;
}

module.exports = {

  friendlyName: 'Get medici',

  description: 'Recupera l\'elenco dei medici da NAR2 filtrando per tipologia (MMG o PLS).',

  inputs: {
    tipoMedico: {
      type: 'string',
      required: true,
      isIn: ['TUTTI','MMG', 'PLS'],
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
      defaultsTo: true
    },
    forceRefresh: {
      type: 'boolean',
      required: false,
      description: 'Se true, forza il refresh dei dati da NAR2 ignorando la cache. La cache ha una scadenza automatica di 2 ore',
      defaultsTo: false
    }
  },

  exits: {},

  fn: async function (inputs) {
    const res = this.res;
    try {
      // Genera la chiave di cache basata sui parametri
      const cacheKey = generateCacheKey({
        tipoMedico: inputs.tipoMedico,
        soloAttivi: inputs.soloAttivi,
        nascondiCessati: inputs.nascondiCessati,
        addSituazioneMedico: inputs.addSituazioneMedico
      });

      // Controlla se esiste una risposta valida in cache e se non è richiesto un refresh forzato
      if (!inputs.forceRefresh) {
        const cachedEntry = mediciCache.get(cacheKey);
        if (isCacheValid(cachedEntry)) {
          sails.log.info(`[get-medici] Restituendo dati dalla cache per chiave: ${cacheKey}`);
          return res.ApiResponse({
            data: {
              totalCount: cachedEntry.data.length,
              medici: cachedEntry.data,
              fromCache: true,
              cachedAt: utils.convertUnixTimestamp(cachedEntry.timestamp,'Europe/Rome', 'YYYY-MM-DD HH:mm:ss')
            }
          });
        }
      }

      // Se non c'è cache valida o è richiesto un refresh, recupera i dati dal service
      sails.log.info(`[get-medici] Recuperando dati freschi da NAR2 per chiave: ${cacheKey}`);

      const tipoArray = [inputs.tipoMedico];
      let config = {
        soloAttivi: inputs.soloAttivi,
        nascondiCessati: inputs.nascondiCessati,
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

      // Salva il risultato in cache
      mediciCache.set(cacheKey, {
        data: medici,
        timestamp: Date.now()
      });

      return res.ApiResponse({
        data: {
          totalCount: medici.length,
          medici,
          fromCache: false
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
