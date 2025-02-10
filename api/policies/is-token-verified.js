const {verifyToken} = require('../services/JwtService');
const {ERROR_TYPES} = require('../responses/ApiResponse');

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
      message: `Token verificato: ${tokenData.valid}`,
      action: req.options.action,
      ipAddress: req.ip,
      user: tokenData.valid ? tokenData.decoded.username : null,
      context: {
        authToken: req.headers.authorization,
        params: req.allParams(),
        tokenData: {
          decoded: tokenData.decoded,
          error: (tokenData.error ? _.omit(tokenData.error, ['stack']) : null)
        }
      }
    });
    if (!tokenData.valid) {
      // log
      await sails.helpers.log.with({
        level: "warn",
        message: `Token non valido: ${tokenData.error.name}`,
        action: req.options.action,
        ipAddress: req.ip,
        context: {
          authToken: req.headers.authorization,
          params: req.allParams(),
          tokenData: {
            decoded: null,
            error: (tokenData.error ? _.omit(tokenData.error, ['stack']) : null)
          }
        }
      });
      return res.ApiResponse(
        {
          errType: tokenData.error.name === 'TokenExpiredError' ? ERROR_TYPES.TOKEN_SCADUTO : ERROR_TYPES.TOKEN_NON_VALIDO,
          errMsg: 'Errore nel token, token non valido'
        });
    }
  } catch (err) {
    // log
    await sails.helpers.log.with({
      level: "error",
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
    return res.ApiResponse(
      {
        errType: ERROR_TYPES.TOKEN_NON_VALIDO,
        errMsg: 'Errore nel token, formato token non valido'
      });
  }
  return proceed();
};
