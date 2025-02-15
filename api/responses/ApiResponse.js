/**
 * ApiResponse.js
 *
 * Custom response per restituire dati ed errori in modo strutturato
 *
 * I parametri in input devono essere un oggetto con:
 *   - errType: il tipo di errore (vedi errorResponse.ERROR_TYPES) oppure null
 *   - errMsg: il messaggio di errore oppure null
 *   - data: i dati da restituire oppure null
 *
 * La risposta restituita sarà un JSON con:
 *   {
 *     ok: false|true,
 *     err: {
 *        code: <errType>,
 *        msg: <errMsg>,
 *     }|null,
 *     data: null|<data>
 *   }
 *
 * Lo status HTTP viene impostato in base al tipo:
 *   - OK -> 200
 *   - ERRORE_GENERICO o altri -> 400
 *   - NON_AUTORIZZATO -> 401
 *   - NON TROVATO -> 404
 *   - ERRORE_DEL_SERVER -> 500
 *   - SERVIZIO_NON_DISPONIBILE -> 503
 *   - TIMEOUT -> 504
 *   - ALREADY_EXISTS -> 409
 *   - MULTIPLE_ERRORS -> 300
 *   - altri -> 500
 *
 * Esempio di utilizzo:
 *   return res.ApiResponse({
 *     errType: ApiResponse.ERROR_TYPES.NON_AUTORIZZATO,
 *     errMsg: 'Messaggio di errore'
 *   });
 *   oppure in caso di successo:
 *   return res.ApiResponse({
 *      data: {
 *          chiave: 'valore'
 *      }
 *   });
 */
const {TAGS} = require('../models/Log');

async function ApiResponse(data) {
  // Recupera req e res dal contesto della response
  const req = this.req;
  const res = this.res;

  // Verifica che tutti i parametri siano stati passati
  if (!data) {
    // Parametri mancanti: restituisco un errore generico con status 400
    res.status(400);
    return res.json({
      ok: false,
      err: {
        code: 'INVALID_ERROR_RESPONSE_PARAMETERS',
        msg: 'I parametri per errorResponse non sono validi',
      },
      data: null
    });
  }

  // Determina lo status HTTP in base al tipo passato
  let statusCode;
  switch (data.hasOwnProperty('errType') ? data.errType : null) {
    case null:
      statusCode = 200;
      break;
    case ApiResponse.BAD_REQUEST:
      statusCode = 400;
      break;
    case ApiResponse.ERROR_TYPES.NON_AUTORIZZATO:
    case ApiResponse.ERROR_TYPES.TOKEN_NON_VALIDO:
    case ApiResponse.ERROR_TYPES.TOKEN_SCADUTO:
      statusCode = 401;
      break;
    case ApiResponse.ERROR_TYPES.NOT_FOUND:
      statusCode = 404;
      break;
    case ApiResponse.ERROR_TYPES.ERRORE_DEL_SERVER:
    case ApiResponse.ERROR_TYPES.ERRORE_GENERICO:
      statusCode = 500;
      break;
    case ApiResponse.ERROR_TYPES.SERVIZIO_NON_DISPONIBILE:
      statusCode = 503;
      break;
    case ApiResponse.ERROR_TYPES.TIMEOUT:
      statusCode = 504;
      break;
    case ApiResponse.ERROR_TYPES.ALREADY_EXISTS:
      statusCode = 409;
      break;
    case ApiResponse.MULTIPLE_ERRORS:
      statusCode = 300;
      break;
    default:
      statusCode = 500;
      break;
  }

  res.status(statusCode);


  let logData = {
    level: data.errType ? 'error' : 'info',
    tag: data.errType ? TAGS.API_RESPONSE_KO : TAGS.API_RESPONSE_OK,
    message: `Risposta API: ${statusCode}`,
    action: req.options.action,
    ipAddress: req.ip,
    context: {
      params: req.allParams(),
      error: data.errType ? {code: data.errType, msg: data.errMsg} : null,
    }
  };
  if (req.user) {
    logData.user = req.user;
  }
  await sails.helpers.log.with(logData);
  // Costruisce e restituisce l'oggetto di risposta
  if (data.errType) {
    return res.json({
      ok: false,
      err: {
        code: data.errType || null,
        msg: data.errMsg || null,
      },
      data: null
    });
  } else {
    return res.json({
      ok: true,
      err: null,
      data: data.data || null
    });
  }
}

// Definiamo delle variabili statiche per i tipi di errore
ApiResponse.ERROR_TYPES = {
  BAD_REQUEST: 'BAD_REQUEST',
  NON_AUTORIZZATO: 'NON_AUTORIZZATO',
  ERRORE_GENERICO: 'ERRORE_GENERICO',
  ERRORE_DEL_SERVER: 'ERRORE_DEL_SERVER',
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  TOKEN_SCADUTO: 'TOKEN_SCADUTO',
  TOKEN_NON_VALIDO: 'TOKEN_NON_VALIDO',
  SERVIZIO_NON_DISPONIBILE: 'SERVIZIO_NON_DISPONIBILE',
  TIMEOUT: 'TIMEOUT',
  MULTIPLE_ERRORS: 'MULTIPLE_ERRORS'
};

module.exports = ApiResponse;
