
const {verifyToken} = require("../services/JwtService");
const {ERROR_TYPES} = require('../responses/ApiResponse');

module.exports = async function (req, res, proceed) {
  try {
    const scopoRichiesto = req.options.scopi;
    const ambitoRichiesto = req.options.ambito;
    const minAuthLevel = req.options.minAuthLevel;
    const bearerToken = req.headers.authorization.split(' ')[1];
    const tokenData = await verifyToken(bearerToken, minAuthLevel, scopoRichiesto, ambitoRichiesto);
    if (!tokenData.valid)
        return res.ApiResponse(
          {
            errType: tokenData.error.name === 'TokenExpiredError' ? ERROR_TYPES.TOKEN_SCADUTO : ERROR_TYPES.TOKEN_NON_VALIDO,
            errMsg: 'Errore nel token, token non valido'
          });
  }
  catch (err) {
    return res.ApiResponse(
      {
        errType: ERROR_TYPES.TOKEN_NON_VALIDO,
        errMsg: 'Errore nel token, formato token non valido'
      });
  }
  return proceed();
};
