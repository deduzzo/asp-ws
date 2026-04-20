/**
 * @swagger
 *
 * /delete:
 *   tags:
 *     - Gestione Extra data Assistiti
 */

const {ERROR_TYPES} = require('../../../responses/ApiResponse');
const MetricsService = require('../../../services/MetricsService');

module.exports = {
  friendlyName: 'Delete extra data assistito',
  description: 'Elimina uno o più dati extra di un assistito per una categoria, identificato tramite codice fiscale.',
  inputs: {
    cf: {
      type: 'string',
      required: true,
      description: 'Codice fiscale o STP dell\'assistito'
    },
    categoria: {
      type: 'string',
      required: true,
      description: 'Codice della categoria (es. CONTATTI)'
    },
    chiavi: {
      type: 'json',
      required: true,
      description: 'Array di chiavi da eliminare (es. ["cellulare", "email"])'
    }
  },
  fn: async function (inputs, exits) {
    try {
      const userScopi = (this.req.tokenData && this.req.tokenData.scopi) || [];
      const username = this.req.user;
      const ipAddress = this.req.ip;

      const assistito = await Anagrafica_Assistiti.findOne({ cf: inputs.cf.toUpperCase() });
      if (!assistito) {
        return this.res.ApiResponse({
          errType: ERROR_TYPES.NOT_FOUND,
          errMsg: 'Assistito non trovato'
        });
      }

      const cat = await Anagrafica_ExtraDataCategorie.findOne({ codice: inputs.categoria.toUpperCase(), attivo: true });
      if (!cat) {
        return this.res.ApiResponse({
          errType: ERROR_TYPES.NOT_FOUND,
          errMsg: 'Categoria non trovata o non attiva'
        });
      }

      // Parsing sicuro di chiavi (potrebbe arrivare come stringa da query string)
      if (typeof inputs.chiavi === 'string') {
        try { inputs.chiavi = JSON.parse(inputs.chiavi); } catch (e) {
          return this.res.ApiResponse({
            errType: ERROR_TYPES.BAD_REQUEST,
            errMsg: 'Il campo chiavi deve essere un array JSON valido'
          });
        }
      }

      if (!sails.helpers.scopeMatches(userScopi, cat.scopoScrittura)) {
        return this.res.ApiResponse({
          errType: ERROR_TYPES.NON_AUTORIZZATO,
          errMsg: 'Non hai i permessi di scrittura per questa categoria'
        });
      }

      MetricsService.extraDataOpsTotal.inc({ operation: 'delete' });
      const risultati = [];

      for (const chiave of inputs.chiavi) {
        const existing = await Anagrafica_ExtraDataValori.findOne({
          assistito: assistito.id,
          categoria: cat.id,
          chiave
        });

        if (existing) {
          await Anagrafica_ExtraDataStorico.create({
            valore: existing.id,
            vecchioValore: existing.valore,
            nuovoValore: null,
            operazione: 'DELETE',
            utente: username,
            ipAddress
          });
          await Anagrafica_ExtraDataValori.destroyOne({ id: existing.id });
          risultati.push({ chiave, operazione: 'DELETE' });
        } else {
          risultati.push({ chiave, operazione: 'NOT_FOUND' });
        }
      }

      return this.res.ApiResponse({
        data: {
          cf: assistito.cf,
          categoria: cat.codice,
          risultati
        }
      });
    } catch (error) {
      sails.log.error('Error deleting extra data:', error);
      return this.res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: 'Errore durante l\'eliminazione dei dati extra'
      });
    }
  }
};
