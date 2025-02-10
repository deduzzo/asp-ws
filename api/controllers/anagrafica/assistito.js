/**
 * @swagger
 *
 * /assistito:
 *   tags:
 *     - Ricerca
 * tags:
 *   - name: Ricerca
 *     description: Interrogazione del database degli assistiti
 */

const moment = require('moment');
const {utils} = require('aziendasanitaria-utils/src/Utils');
const AssistitoService = require('../../services/AssistitoService');
const {ERROR_TYPES} = require('../../responses/ApiResponse');

const maxResults = 100;

module.exports = {

  friendlyName: 'Ricerca Assistito',

  description:
    'Ricerca assistito tramite parametri. Restituisce un array di assistiti. ' +
    'E\' necessario inserire almeno 5 caratteri del codice fiscale oppure 2 tra nome, cognome e data di nascita',

  inputs: {
    codiceFiscale: {
      type: 'string',
      required: false,
      description: 'Il codice fiscale dell\'assistito'
    },
    nome: {
      type: 'string',
      required: false,
      description: 'Il nome dell\'assistito'
    },
    cognome: {
      type: 'string',
      required: false,
      description: 'Il cognome dell\'assistito'
    },
    dataNascita: {
      type: 'string',
      required: false,
      description: 'La data di nascita dell\'assistito'
    }
  },
  exits: {
  },
  fn: async function (inputs,exits) {
    const res = this.res;
    // Verifica che sia stato fornito almeno un parametro di ricerca
    if (!inputs.codiceFiscale && !inputs.nome && !inputs.cognome && !inputs.dataNascita) {
      return res.ApiResponse({
        errType: ERROR_TYPES.BAD_REQUEST,
        errMsg: 'Inserire almeno un parametro di ricerca'
      });
    }

    // Inizializza i criteri di ricerca
    let criteria = {};

    // Se viene fornito il codice fiscale, verificane la lunghezza
    if (inputs.codiceFiscale) {
      if (inputs.codiceFiscale.length < 5) {
        // Se il codice fiscale è presente ma non raggiunge i 5 caratteri, si controlla che siano presenti almeno altri 2 parametri
        let count = 0;
        if (inputs.nome) {
          count++;
        }
        if (inputs.cognome) {
          count++;
        }
        if (inputs.dataNascita) {
          count++;
        }
        if (count < 2) {
          return res.ApiResponse({
            errType: ERROR_TYPES.BAD_REQUEST,
            errMsg: 'Inserire almeno un parametro di ricerca'
          });
        }
      } else {
        // Filtraggio per codice fiscale (ricerca parziale)
        criteria.cf = {like: `%${inputs.codiceFiscale}%`};
      }
    }

    // Aggiungi il filtro per il nome, se presente (ricerca parziale)
    if (inputs.nome) {
      criteria.nome = {like: `%${inputs.nome}%`};
    }

    // Aggiungi il filtro per il cognome, se presente (ricerca parziale)
    if (inputs.cognome) {
      criteria.cognome = {like: `%${inputs.cognome}%`};
    }

    // Aggiungi il filtro per la data di nascita, se presente (ricerca parziale)
    // NOTA: nel modello il campo dataNascita è un numero (timestamp). Per usare una ricerca parziale
    // occorrerebbe che l'input corrisponda al formato usato (es. se memorizziamo la data come stringa formattata).
    // Se non è possibile, potrebbe essere necessario gestire la ricerca in maniera diversa.
    if (inputs.dataNascita && moment(inputs.dataNascita, 'DD/MM/YYYY', true).isValid()) {
      //convert to unix timestamp
      const dataNascita = utils.convertToUnixSeconds(inputs.dataNascita);
      criteria.dataNascita = dataNascita;
    }
    //  verifichiamo che la stringa sia un anno, in questo caso impostiamo la query in modo che vengano cercati tutti gli assistiti nati in quell'anno
    else if (inputs.dataNascita && moment(inputs.dataNascita, 'YYYY', true).isValid()) {
      const start = utils.convertToUnixSeconds(moment(inputs.dataNascita, 'YYYY').startOf('year').format('DD/MM/YYYY'));
      const end = utils.convertToUnixSeconds(moment(inputs.dataNascita, 'YYYY').endOf('year').format('DD/MM/YYYY'));
      criteria.dataNascita = {'>=': start, '<=': end};
    }

    // Se non è stato fornito un codice fiscale valido, assicuriamoci che siano presenti almeno due tra nome, cognome e dataNascita
    if (!criteria.cf) {
      let count = 0;
      if (inputs.nome) {
        count++;
      }
      if (inputs.cognome) {
        count++;
      }
      if (inputs.dataNascita) {
        count++;
      }
      if (count < 2) {
        return res.ApiResponse({
          errType: ERROR_TYPES.BAD_REQUEST,
          errMsg: 'Inserire almeno un parametro di ricerca'
        });
      }
    }

    // Esegui la ricerca sul modello Anagrafica_Assistiti utilizzando i criteri costruiti
    try {
      let assistiti = await Anagrafica_Assistiti.find({
        where: criteria
      });

      if (!assistiti || assistiti.length === 0) {
        // se il codice fiscale è completo, facciamo un ulteriore tentativo di verifica nel sistema ts
        if (inputs.codiceFiscale && inputs.codiceFiscale.length >= 16) {
          const assistito = await AssistitoService.getAssistitoFromCf(inputs.codiceFiscale);
          if (assistito) {
            // add assistito to db
            const created = await Anagrafica_Assistiti.create(assistito).fetch();
            assistiti = [created];
          }
        }
      }

      if (!assistiti || assistiti.length === 0) {
        return res.ApiResponse({
          errType: ERROR_TYPES.NOT_FOUND,
          errMsg: 'Nessun assistito trovato'
        });
      }

      let outData =  {
        totalCount: assistiti.length,
      };
      if (outData.totalCount >maxResults) {
        outData.realCount = maxResults;
        outData.message = 'Troppi risultati, si prega di affinare la ricerca. Verranno mostrati solo i primi 100 elementi;';
        outData.assistiti = assistiti.slice(0, maxResults);
      }
      else
        outData.assistiti = assistiti;
      return res.ApiResponse({
        data: outData
      });
    } catch (err) {
      // Propaga l'errore (che verrà gestito dai rispettivi responseType)
      return res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: err.message
      });
    }
  }
};
