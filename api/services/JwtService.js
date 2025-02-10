// api/services/JwtService.js
const jwt = require('jsonwebtoken');
const {utils} = require('aziendasanitaria-utils/src/Utils');

const JwtService = {
  // Funzioni di utilità per accedere alla configurazione
  getSecret: () => {
    return sails.config.custom.jwtSecret;
  },

  getTokenExpiry: () => {
    return sails.config.custom.jwtExpiresIn;
  },

  getRefreshTokenExpiry: () => {
    return sails.config.custom.jwtRefreshTokenExpiresIn;
  },

  /**
   * Genera un token JWT per l'utente.
   *
   * @param {Object} userData - I dati dell'utente per cui generare il token.
   * @param {string} userData.username - Il nome utente dell'utente.
   * @param {Array} userData.scopi - Gli scopi associati all'utente.
   * @param {string} userData.ambito - L'ambito dell'utente.
   * @param {number} userData.livello - Il livello di accesso dell'utente.
   * @returns {{token: *, expiresIn: *}|null} - Il token JWT generato e la data di scadenza, o null in caso di errore.
   */
  generateToken: (userData) => {
    const payload = {
      username: userData.username,
      scopi: userData.scopi,
      ambito: userData.ambito,
      livello: userData.livello
    };
    try {
      const token = jwt.sign(payload, JwtService.getSecret(), {expiresIn: JwtService.getTokenExpiry()});
      const verify = jwt.verify(token, JwtService.getSecret());
      return {
        token: token,
        expireDate: utils.convertUnixTimestamp(verify.exp,'Europe/Rome', 'DD/MM/YYYY HH:mm:ss')
      };
    } catch (err) {
      return null;
    }
  },

  // Verifica token
  verifyToken: async (token, livelloRichiesto, scopoRichiesto, ambitoRichiesto) => {
    try {
      const decoded = jwt.verify(token, JwtService.getSecret());
      const isValid = await JwtService.verificaPermessi(decoded, livelloRichiesto, scopoRichiesto, ambitoRichiesto);
      return isValid ? {valid: true, decoded, error: null} : {valid: false, decoded: null, error: null};
    } catch (err) {
      return {valid: false, decoded: null, error: err};
    }
  },
  verificaPermessi: async (decoded, livelloRichiesto, scopoRichiesto, ambitoRichiesto) => {
    if (!decoded.hasOwnProperty('username') || !decoded.hasOwnProperty('scopi') || !decoded.hasOwnProperty('ambito') || !decoded.hasOwnProperty('livello')) {
      return false;
    }
    let {username, scopi, ambito, livello} = decoded;
    console.log('Verifica permessi per:', username);
    const utente = await Auth_Utenti.findOne({username: username}).populate('ambito').populate('scopi');
    const scopiUtenteAttivi = utente.scopi.filter(s => s.attivo).map(s => s.scopo);
    const utenteHaAutorizzazioneAScopoToken = scopi.every(s => scopiUtenteAttivi.includes(s));
    const utenteHaAutorizzazioneAScopiRichiesti = scopoRichiesto.every(s => scopiUtenteAttivi.includes(s));
    if (!utente || !utente.attivo || !utenteHaAutorizzazioneAScopoToken || !utenteHaAutorizzazioneAScopiRichiesti || !utente.ambito
      || utente.ambito.ambito !== ambito || ambito !== ambitoRichiesto || utente.livello < livelloRichiesto || livello !== utente.livello) {
      return false;
    }

    return true;
  },
  LOGIN_LEVEL: {
    guest: 0,
    user: 1,
    admin: 2,
    superAdmin: 99
  }
};
module.exports = JwtService;
