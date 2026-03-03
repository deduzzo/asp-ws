/**
 * @swagger
 *
 * /ricerca-nar2:
 *   tags:
 *     - Anagrafica
 */

const moment = require('moment');
const {ERROR_TYPES} = require('../../responses/ApiResponse');
const configData = require('../../../config/custom/private_nar_ts_config.json');
const keys = require('../../../config/custom/private_encrypt_key.json');

const maxResults = 100;

module.exports = {

  friendlyName: 'Ricerca Assistito su NAR2',

  description:
    'Ricerca assistito tramite parametri. Restituisce un array di assistiti ed altre informazioni.<br />' +
    'Se la ricerca produce più di 100 risultati, verranno restituiti solo i primi 100.<br />' +
    'E\' necessario inserire almeno 5 caratteri del codice fiscale oppure 2 parametri a scelta tra nome, cognome e data di nascita (questi ultimi devono contenere almeno 3 caratteri, 4 per la data di nascita per garantire la ricerca per anno)<br />' +
    'Non viene fatta nessuna modifica sul database locale, per farlo è necessario fare una ricerca con la chiamata ricerca usando forzaAggiornamentoTs a true',

  inputs: {
    codiceFiscale: {
      type: 'string',
      required: false,
      minLength: 3,
      description: 'Il codice fiscale dell\'assistito (minimo 3 caratteri, se i caratteri sono da 3 a 5 devono essere presenti almeno altri 2 parametri di ricerca)'
    },
    nome: {
      type: 'string',
      required: false,
      minLength: 3,
      description: 'Il nome dell\'assistito (o parte di esso, minimo 3 caratteri)'
    },
    cognome: {
      type: 'string',
      required: false,
      minLength: 3,
      description: 'Il cognome dell\'assistito (o parte di esso, minimo 3 caratteri)'
    },
    dataNascita: {
      type: 'string',
      required: false,
      minLength: 4,
      description: 'La data di nascita dell\'assistito (o l\'anno di nascita)'
    },
  },
  exits: {},
  fn: async function (inputs, exits) {
    const res = this.res;
    // Verifica che sia stato fornito almeno un parametro di ricerca
    if (!inputs.codiceFiscale && !inputs.nome && !inputs.cognome && !inputs.dataNascita) {
      return res.ApiResponse({
        errType: ERROR_TYPES.BAD_REQUEST,
        errMsg: 'Inserire almeno un parametro di ricerca'
      });
    }

    // Se non è stato fornito il codice fiscale, servono almeno 2 parametri tra nome, cognome e dataNascita
    if (!inputs.codiceFiscale) {
      let count = 0;
      if (inputs.nome) count++;
      if (inputs.cognome) count++;
      if (inputs.dataNascita) count++;
      if (count < 2) {
        return res.ApiResponse({
          errType: ERROR_TYPES.BAD_REQUEST,
          errMsg: 'Inserire almeno un parametro di ricerca'
        });
      }
    }

    // Costruisci i parametri per Nar2
    let params = {};
    if (inputs.codiceFiscale) {
      params.codiceFiscale = inputs.codiceFiscale;
    }
    if (inputs.nome) {
      params.nome = inputs.nome;
    }
    if (inputs.cognome) {
      params.cognome = inputs.cognome;
    }
    // Converti la data di nascita nel formato YYYY-MM-DD richiesto da Nar2
    if (inputs.dataNascita) {
      if (moment(inputs.dataNascita, 'DD/MM/YYYY', true).isValid()) {
        params.dataNascita = moment(inputs.dataNascita, 'DD/MM/YYYY').format('YYYY-MM-DD');
      } else if (moment(inputs.dataNascita, 'YYYY-MM-DD', true).isValid()) {
        params.dataNascita = inputs.dataNascita;
      } else if (moment(inputs.dataNascita, 'YYYY', true).isValid()) {
        params.dataNascita = `${inputs.dataNascita}-01-01`;
      }
    }

    try {
      const {ImpostazioniServiziTerzi} = await import('aziendasanitaria-utils/src/config/ImpostazioniServiziTerzi.js');
      const {Nar2} = await import('aziendasanitaria-utils/src/narTsServices/Nar2.js');
      let impostazioniServizi = new ImpostazioniServiziTerzi(configData);
      let nar2 = new Nar2(impostazioniServizi, {...keys});

      let timeout = false;
      const result = await Promise.race([
        nar2.getAssistitiFromParams(params),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 20000))
      ]).catch(err => {
        if (err.message === 'Timeout') {
          timeout = true;
        }
        return null;
      });

      if (timeout) {
        return res.ApiResponse({
          errType: ERROR_TYPES.TIMEOUT,
          errMsg: 'Timeout durante la ricerca su Nar2'
        });
      }

      if (!result || !result.ok || !result.data || result.data.length === 0) {
        return res.ApiResponse({
          errType: ERROR_TYPES.NOT_FOUND,
          errMsg: 'Nessun assistito trovato'
        });
      }

      let assistiti = result.data;
      let outData = {
        totalCount: assistiti.length,
      };
      if (outData.totalCount > maxResults) {
        outData.realCount = maxResults;
        outData.message = 'Troppi risultati, si prega di affinare la ricerca. Verranno mostrati solo i primi 100 elementi;';
        outData.assistiti = assistiti.slice(0, maxResults);
      } else {
        outData.assistiti = assistiti;
      }
      return res.ApiResponse({
        data: outData
      });
    } catch (err) {
      return res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: err.message
      });
    }
  }
};
