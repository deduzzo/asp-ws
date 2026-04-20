const {verifyToken} = require('../services/JwtService');
const {ERROR_TYPES} = require('../responses/ApiResponse');
const {TAGS} = require('../models/Log');

module.exports = async function (req, res, proceed) {
  try {
    const scopoRichiesto = req.options.scopi;
    const ambitoRichiesto = req.options.ambito;
    const minAuthLevel = req.options.minAuthLevel;
    const bearerToken = req.headers.authorization.split(' ')[1];
    const tokenData = await verifyToken(bearerToken, minAuthLevel, scopoRichiesto, ambitoRichiesto);
    //log
    await sails.helpers.log.with({
      level: "info",
      tag: TAGS.TOKEN_VERIFY_OK,
      message: `Token verificato: ${tokenData.valid}`,
      action: req.options.action,
      ipAddress: req.ip,
      user: tokenData.valid ? tokenData.decoded.username : "null",
      context: {
        authToken: req.headers.authorization,
        params: req.allParams(),
        tokenData: {
          decoded: tokenData.decoded,
          error: (tokenData.error ? _.omit(tokenData.error, ['stack']) : "null")
        }
      }
    });
    if (!tokenData.valid) {
      const jwtResult = tokenData.error && tokenData.error.name === 'TokenExpiredError' ? 'expired' : 'invalid';
      const mSql = 'INSERT INTO metrics_counters (metric, label1_name, label1_value, cnt) VALUES ($1, $2, $3, 1) ON DUPLICATE KEY UPDATE cnt = cnt + 1';
      Log.getDatastore().sendNativeQuery(mSql, ['jwt_auth', 'result', jwtResult]).catch(() => {});
      // log
      await sails.helpers.log.with({
        level: "warn",
        tag: TAGS.TOKEN_VERIFY_KO,
        message: `Token non valido: ${tokenData.error.name}`,
        action: req.options.action,
        ipAddress: req.ip,
        context: {
          authToken: req.headers.authorization,
          params: req.allParams(),
          tokenData: {
            decoded: "null",
            error: (tokenData.error ? _.omit(tokenData.error, ['stack']) : "null")
          }
        }
      });
      return res.ApiResponse(
        {
          errType: tokenData.error ? (tokenData.error.name === 'TokenExpiredError' ? ERROR_TYPES.TOKEN_SCADUTO : ERROR_TYPES.TOKEN_NON_VALIDO) : ERROR_TYPES.TOKEN_NON_VALIDO,
          errMsg: 'Errore nel token, token non valido'
        });
    }
    else {
      Log.getDatastore().sendNativeQuery('INSERT INTO metrics_counters (metric, label1_name, label1_value, cnt) VALUES ($1, $2, $3, 1) ON DUPLICATE KEY UPDATE cnt = cnt + 1', ['jwt_auth', 'result', 'valid']).catch(() => {});
      req.user = tokenData.decoded.username;
      req.tokenData = tokenData.decoded;
    }
  } catch (err) {
    // log
    await sails.helpers.log.with({
      level: "error",
      tag: TAGS.TOKEN_VERIFY_KO,
      message: `Errore durante la verifica del token: ${err.name}`,
      action: req.options.action,
      ipAddress: req.ip,
      context: {
        authToken: req.headers.authorization,
        params: req.allParams(),
        tokenData: {
          decoded: null,
          error: (err ? _.omit(err, ['stack']) : null)
        }
      }
    });
    Log.getDatastore().sendNativeQuery('INSERT INTO metrics_counters (metric, label1_name, label1_value, cnt) VALUES ($1, $2, $3, 1) ON DUPLICATE KEY UPDATE cnt = cnt + 1', ['jwt_auth', 'result', 'error']).catch(() => {});
    return res.ApiResponse(
      {
        errType: ERROR_TYPES.TOKEN_NON_VALIDO,
        errMsg: 'Errore nel token, formato token non valido'
      });
  }
  return proceed();
};
