/**
 * @swagger
 *
 * /admin-op/search-user:
 *   tags:
 *     - Admin
 * tags:
 *   - name: Admin
 *     description: Gestione amministrativa utenti, password e OTP. Richiede scope admin-manage e livello superAdmin.
 */

const {ERROR_TYPES} = require('../../responses/ApiResponse');

module.exports = {
  friendlyName: 'Admin search user',
  description: 'Cerca utenti per username con filtri opzionali su dominio, ambiti e scopi.',
  swagger: {
    tags: ['Admin']
  },
  inputs: {
    username: {
      type: 'string',
      description: 'Username da cercare (ricerca contains/like). Se omesso, restituisce tutti gli utenti.'
    },
    dominio: {
      type: 'string',
      description: 'Filtro per dominio (contains)'
    },
    ambito: {
      type: 'string',
      description: 'Filtro per nome ambito (contains)'
    },
    scopo: {
      type: 'string',
      description: 'Filtro per nome scopo (contains)'
    }
  },

  fn: async function (inputs) {
    try {
      // Costruisci query
      const whereClause = {};

      // Filtro username (opzionale)
      if (inputs.username) {
        whereClause.username = {contains: inputs.username};
      }

      // Filtro dominio
      if (inputs.dominio) {
        whereClause.domain = {contains: inputs.dominio};
      }

      // Cerca utenti
      let utenti = await Auth_Utenti.find({where: whereClause})
        .populate('ambito')
        .populate('livello')
        .populate('scopi');

      // Filtro per ambito (testuale sul nome)
      if (inputs.ambito) {
        const filtroAmbito = inputs.ambito.toLowerCase();
        utenti = utenti.filter(u =>
          u.ambito && u.ambito.ambito && u.ambito.ambito.toLowerCase().includes(filtroAmbito)
        );
      }

      // Filtro per scopo (testuale sul nome)
      if (inputs.scopo) {
        const filtroScopo = inputs.scopo.toLowerCase();
        utenti = utenti.filter(u =>
          u.scopi && u.scopi.some(s => s.scopo && s.scopo.toLowerCase().includes(filtroScopo))
        );
      }

      // Formatta risposta escludendo dati sensibili
      const risultati = utenti.map(u => ({
        id: u.id,
        username: u.username,
        mail: u.mail,
        domain: u.domain,
        allow_domain_login: u.allow_domain_login,
        attivo: u.attivo,
        otp_enabled: u.otp_enabled,
        otp_type: u.otp_type,
        otp_required: u.otp_required,
        ambito: u.ambito,
        livello: u.livello,
        scopi: u.scopi
      }));

      return this.res.ApiResponse({
        data: {
          count: risultati.length,
          utenti: risultati
        }
      });

    } catch (err) {
      sails.log.error('Errore admin search user:', err);
      return this.res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: 'Errore durante la ricerca utenti'
      });
    }
  }
};
