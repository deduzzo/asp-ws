// api/services/JwtService.js
const jwt = require('jsonwebtoken');

module.exports = {
  // Configurazione
  SECRET: sails.config.custom.jwtSecret,
  TOKEN_EXPIRY: sails.config.custom.jwtExpiresIn,
  REFRESH_TOKEN_EXPIRY: sails.config.custom.jwtRefreshTokenExpiresIn,

  /**
   * Genera un token JWT per l'utente.
   *
   * @param {Object} userData - I dati dell'utente per cui generare il token.
   * @param {string} userData.username - Il nome utente dell'utente.
   * @param {Array} userData.scopi - Gli scopi associati all'utente.
   * @param {string} userData.ambito - L'ambito dell'utente.
   * @returns {string} - Il token JWT generato.
   */
  generateToken: function (userData) {
    const payload = {
      username: userData.username,
      scopi: userData.scopi,
      ambito: userData.ambito
    };
    return jwt.sign(payload, this.SECRET, {expiresIn: this.TOKEN_EXPIRY});
  },

  // Genera refresh token
  generateRefreshToken: function (userData) {
    const payload = {
      username: userData.username,
      type: 'refresh'
    };
    return jwt.sign(payload, this.SECRET, {expiresIn: this.REFRESH_TOKEN_EXPIRY});
  },

  // Verifica token
  verifyToken: async function (token,livelloRichiesto) {
    try {
      const decoded = jwt.verify(token, this.SECRET);
      const isValid = await this.verificaPermessi(decoded,livelloRichiesto);
      return isValid ? {valid: true, decoded, error: null} : {valid: false, decoded: null, error: null};
    } catch (err) {
      return {valid: false, decoded: null, error: err};
    }
  },

  // Rinnova token usando refresh token
  refreshToken: async function (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, this.SECRET);
      if (decoded.type !== 'refresh') {
        return false;
      }

      const userData = await this.getUser(decoded.username);
      if (!userData || await this.isTokenRevoked(refreshToken)) {
        return false;
      }

      return this.generateToken(userData);
    } catch (err) {
      return false;
    }
  },

  // Funzioni da implementare per la verifica nel DB
  verificaPermessi: async function (decoded, livelloRichiesto) {
    if (!decoded.hasOwnProperty('username') || !decoded.hasOwnProperty('scopi') || !decoded.hasOwnProperty('ambito'))
      return false;
    let {username, scopi, ambito} = decoded;
    console.log('Verifica permessi per:', username);
    const user = await auth_Utenti.findOne({username: username}).populate('ambito').populate('livello').populate('scopi');
    // if user not contains the decoded scopi, user.scopi is an array of object
    const haveScopi = user.scopi.some(s => scopi.includes(s.scopo));
    if (!user || !user.attivo || !haveScopi || !user.ambito || user.ambito.ambito !== ambito || user.livello.id< livelloRichiesto)
      return false;

    return true;
  },

  getUser: async function (username) {
    // Recupera dati utente dal DB
    return null;
  },

  isTokenRevoked: async function (token) {
    // Verifica se il token è stato revocato
    return false;
  }
};
