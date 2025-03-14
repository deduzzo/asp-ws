/**
 * @swagger
 *
 * /get-geo-data:
 *     tags:
 *       - Anagrafica
 */
const {createJob,updateJob} = require('../../services/JobManager');
const {getGeoAssistito} = require('../../services/AssistitoService');
const {utils} = require('aziendasanitaria-utils/src/Utils');
module.exports = {
  friendlyName: 'Assistiti in base ai dati geografici per comune di residenza',
  description: 'Ottieni i dati geografici degli assistiti per comune di residenza',
  inputs: {
    codComuneResidenza: {
      type: 'string',
      required: true,
      description: 'Codice del comune di residenza'
    },
    onlyGeolocationPrecise: {
      type: 'boolean',
      description: 'Se true, ritorna solo i record con geolocazione precisa',
      defaultsTo: false
    },
    onlyGeoloc: {
      type: 'boolean',
      description: 'Se true, ritorna solo i record geolocalizzati',
      defaultsTo: false
    },
    forceUpdate: {
      type: 'boolean',
      description: 'Se true, forza l\'aggiornamento dei dati geolocalizzati',
      defaultsTo: false
    }
  },
  exits: {},

  fn: async function (inputs) {
    const res = this.res;
    let data = null;
    let criteria = {};
    let campi = ['cf', 'capResidenza', 'indirizzoResidenza', 'lat', 'long', 'geolocPrecise'];

    if (inputs.onlyGeoloc === true) {
      criteria = {
        codComuneResidenza: inputs.codComuneResidenza,
        lat: {'!=': null}
      };
    }

    if (inputs.onlyGeolocationPrecise === true) {
      criteria = {...criteria, geolocPrecise: true};
    }

    if (Object.keys(criteria).length !== 0) {
      data = await Anagrafica_Assistiti.find({
        select: campi,
        where: criteria
      });

      // Se non è richiesto l'aggiornamento forzato, restituisci i dati immediatamente
      if (!inputs.forceUpdate) {
        const cleanedData = data.map(item => _.omit(item, ['createdAt', 'updatedAt']));
        if (cleanedData.length === 0) {
          return res.ApiResponse({
            errType: ERROR_TYPES.NOT_FOUND,
            errMsg: 'Nessun assistito trovato'
          });
        } else {
          return res.ApiResponse({ data: cleanedData });
        }
      }
    } else {
      let query = ` select \`cf\`, \`capResidenza\`, \`indirizzoResidenza\`, \`lat\`, \`long\`, \`geolocPrecise\`
                    FROM ${Anagrafica_Assistiti.tableName}
                    WHERE lat IS NULL
                      AND codComuneResidenza = $1
                      AND (indirizzoResidenza IS NOT NULL OR capResidenza IS NOT NULL)`;
      let rawResult = await Anagrafica_Assistiti.getDatastore().sendNativeQuery(query, [inputs.codComuneResidenza]);
      data = rawResult.rows;
    }

    // Crea un job asincrono per l'aggiornamento delle geolocalizzazioni
    const jobId = createJob('geoloc', data.length);

    // Avvia il processo in background
    setImmediate(async () => {
      try {
        let processedItems = 0;

        for (let assistito of data) {
          if (inputs.forceUpdate) {
            let geoloc = await getGeoAssistito(assistito);
            if (geoloc) {
              assistito.lat = geoloc.lat;
              assistito.long = geoloc.lon;
              assistito.geolocPrecise = geoloc.precise;

              // Aggiorna il record nel database
              await Anagrafica_Assistiti.updateOne({ cf: assistito.cf }).set({
                lat: geoloc.lat,
                long: geoloc.lon,
                geolocPrecise: geoloc.precise,
                lastCheck: utils.nowToUnixDate()
              });
            } else {
              assistito.lat = null;
              assistito.long = null;
              assistito.geolocPrecise = false;

              // Aggiorna il record nel database
              await Anagrafica_Assistiti.updateOne({ cf: assistito.cf }).set({
                lat: null,
                long: null,
                geolocPrecise: false,
                lastCheck: utils.nowToUnixDate()
              });
            }
          }
          processedItems++;
          console.log(`Processed ${processedItems} of ${data.length} items`);
          updateJob(jobId, { processedItems });
        }

        const cleanedData = data.map(item => _.omit(item, ['createdAt', 'updatedAt']));
        updateJob(jobId, {
          status: 'completed',
          result: cleanedData
        });
      } catch (error) {
        sails.log.error('Errore nel job di geolocalizzazione:', error);
        updateJob(jobId, {
          status: 'error',
          error: error.message
        });
      }
    });

    // Restituisci immediatamente l'ID del job
    return res.ApiResponse({
      data: { jobId }
    });
  }
};
