// api/services/JwtService.js
const jwt = require('jsonwebtoken');

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
   * @returns {string} - Il token JWT generato.
   */
  generateToken: (userData) => {
    const payload = {
      username: userData.username,
      scopi: userData.scopi,
      ambito: userData.ambito
    };
    return jwt.sign(payload, JwtService.getSecret(), {expiresIn: JwtService.getTokenExpiry()});
  },

  // Genera refresh token
  generateRefreshToken: (userData) => {
    const payload = {
      username: userData.username,
      type: 'refresh'
    };
    return jwt.sign(payload, JwtService.getSecret(), {expiresIn: JwtService.getRefreshTokenExpiry()});
  },

  // Verifica token
  verifyToken: async (token, livelloRichiesto) => {
    try {
      const decoded = jwt.verify(token, JwtService.getSecret());
      const isValid = await JwtService.verificaPermessi(decoded, livelloRichiesto);
      return isValid ? {valid: true, decoded, error: null} : {valid: false, decoded: null, error: null};
    } catch (err) {
      return {valid: false, decoded: null, error: err};
    }
  },

  // Rinnova token usando refresh token
  refreshToken: async (refreshToken) => {
    try {
      const decoded = jwt.verify(refreshToken, JwtService.getSecret());
      if (decoded.type !== 'refresh') {
        return false;
      }

      const userData = await JwtService.getUser(decoded.username);
      if (!userData || await JwtService.isTokenRevoked(refreshToken)) {
        return false;
      }

      return JwtService.generateToken(userData);
    } catch (err) {
      return false;
    }
  },

  // Funzioni da implementare per la verifica nel DB
  verificaPermessi: async (decoded, livelloRichiesto) => {
    if (!decoded.hasOwnProperty('username') || !decoded.hasOwnProperty('scopi') || !decoded.hasOwnProperty('ambito')) {
      return false;
    }
    let {username, scopi, ambito} = decoded;
    console.log('Verifica permessi per:', username);
    const user = await auth_Utenti.findOne({username: username}).populate('ambito').populate('livello').populate('scopi');
    // if user not contains the decoded scopi, user.scopi is an array of object
    const haveScopi = user.scopi.some(s => scopi.includes(s.scopo));
    if (!user || !user.attivo || !haveScopi || !user.ambito || user.ambito.ambito !== ambito || user.livello.id < livelloRichiesto) {
      return false;
    }

    return true;
  },

  getUser: async (username) => {
    // Recupera dati utente dal DB
    return null;
  },

  isTokenRevoked: async (token) => {
    // Verifica se il token è stato revocato
    return false;
  }
};

module.exports = JwtService;
