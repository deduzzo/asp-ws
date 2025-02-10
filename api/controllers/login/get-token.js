/**
 * @swagger
 *
 * /get-token:
 *   tags:
 *     - Auth
 */

const { generateToken } = require('../../services/JwtService');
const {ERROR_TYPES} = require('../../responses/ApiResponse');

module.exports = {
  friendlyName: 'GetToken',

  description:
    'Genera un token JWT per l\'utente specificato con scopo e ambito specificati. L\'utente deve essere abilitato ed avere il permesso sullo scopo e lo stesso ambito d\'utenza',

  inputs: {
    login: {
      type: 'string',
      required: true,
      description: 'Login utente'
    },
    password: {
      type: 'string',
      required: true,
      description: 'Password utente'
    },
    scopi: {
      type: 'string',
      required: true,
      description:
        'Scopo del token, almeno uno obbligatorio, separati da spazi.'
    },
    ambito: {
      type: 'string',
      required: false,
      description:
        'Ambito d\'utenza del token. In caso di campo vuoto il valore di default è "generale"'
    }
  },

  exits: {
  },

  fn: async function (inputs, exits) {
    const res = this.res;
    try {
      // Cerca l'utente in base al login e popola i campi relazionati
      const utente = await Auth_Utenti.findOne({ username: inputs.login })
        .populate('scopi')
        .populate('ambito');

      if (!utente) {
        return res.ApiResponse({
          errType: ERROR_TYPES.NON_AUTORIZZATO,
          errMsg: 'Utente non trovato'
        });
      }

      if (!utente.attivo) {
        return res.ApiResponse({
          errType: ERROR_TYPES.NON_AUTORIZZATO,
          errMsg: 'Utente non attivo'
        });
      }

      // Se la data di disattivazione è passata, disattiva l'utente
      if (utente.data_disattivazione && utente.data_disattivazione <= Date.now()) {
        await Auth_Utenti.updateOne({ username: inputs.login }).set({ attivo: false });
        return res.ApiResponse({
          errType: ERROR_TYPES.ERRORE_GENERICO,
          errMsg: 'Utente non attivo'
        });
      }

      // Verifica la password
      await sails.helpers.passwords.checkPassword(inputs.password, utente.hash_password);

      // Verifica l'ambito
      if (!inputs.ambito || utente.ambito.ambito !== inputs.ambito) {
        return res.ApiResponse({
          errType: ERROR_TYPES.NON_AUTORIZZATO,
          errMsg: 'Ambito non autorizzato'
        });
      }

      // Controlla che tutti gli scopi richiesti siano presenti in utente.scopi
      const scopi = inputs.scopi.split(' ').map(s => s.trim()).filter(s => s.length > 0);
      const scopiUtenteAttivi = utente.scopi.filter(s => s.attivo).map(s => s.scopo);
      const utenteHaAutorizzazioneAScopoToken = scopi.every(s => scopiUtenteAttivi.includes(s));
      if (!utenteHaAutorizzazioneAScopoToken) {
        return res.ApiResponse({
          errType: ERROR_TYPES.NON_AUTORIZZATO,
          errMsg: 'Scopo non autorizzato'
        });
      }

      // Genera il token
      const token = generateToken({
        username: utente.username,
        scopi: scopi,
        ambito: utente.ambito.ambito,
        livello: utente.livello
      });
      if (!token) {
        return res.ApiResponse({
          errType: ERROR_TYPES.ERRORE_DEL_SERVER,
          errMsg: 'Errore generazione token'
        });
      }

      // Restituisce il token generato con exit success
      return res.ApiResponse({
        data: {
          token: token
        }
      });
    } catch (err) {
      // if is incorrect
      if (err.code === "incorrect" && err.exit === "incorrect") {
        return res.ApiResponse({
          errType: ERROR_TYPES.NON_AUTORIZZATO,
          errMsg: 'Password errata'
        });
      }
      return res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: 'Errore generico'
      });
    }
  }
};
