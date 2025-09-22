/**
 * @swagger
 *
 * /verify-token:
 *   tags:
 *     - Auth
 */

const jwt = require('jsonwebtoken');
const {ERROR_TYPES} = require('../../responses/ApiResponse');
const JwtService = require('../../services/JwtService');
const {utils} = require('aziendasanitaria-utils/src/Utils');

module.exports = {


  friendlyName: 'Verify token',


  description: 'Verifica la validità di un token JWT e restituisce le informazioni contenute',


  inputs: {
    token: {
      type: 'string',
      required: true,
      description: 'Token JWT da verificare'
    }
  },


  exits: {

  },


  fn: async function (inputs) {
    const res = this.res;

    try {
      // Verifica il token e decodifica il payload
      const decoded = jwt.verify(inputs.token, JwtService.getSecret());

      // Recupera info utente per restituire scopi abilitati e ambito effettivo
      const utente = await Auth_Utenti.findOne({username: decoded.username})
        .populate('scopi')
        .populate('ambito');

      const scopiAbilitati = utente && utente.scopi ? utente.scopi.filter(s => s.attivo).map(s => s.scopo) : [];
      const ambitoUtente = utente && utente.ambito ? utente.ambito.ambito : null;

      return res.ApiResponse({
        data: {
          valid: true,
          token: {
            username: decoded.username,
            scopi: decoded.scopi,
            ambito: decoded.ambito,
            livello: decoded.livello,
            iat: decoded.iat,
            exp: decoded.exp,
            expireDate: utils.convertUnixTimestamp(decoded.exp, 'Europe/Rome', 'DD/MM/YYYY HH:mm:ss')
          },
          utente: utente ? {
            username: utente.username,
            attivo: utente.attivo,
            ambito: ambitoUtente,
            livello: utente.livello,
            scopiAbilitati: scopiAbilitati
          } : null
        }
      });
    } catch (err) {
      // Gestione errori di token
      if (err && err.name === 'TokenExpiredError') {
        return res.ApiResponse({
          errType: ERROR_TYPES.TOKEN_SCADUTO,
          errMsg: 'Token scaduto'
        });
      }
      return res.ApiResponse({
        errType: ERROR_TYPES.TOKEN_NON_VALIDO,
        errMsg: 'Token non valido'
      });
    }

  }


};
