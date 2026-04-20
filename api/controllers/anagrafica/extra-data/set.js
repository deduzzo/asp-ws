/**
 * @swagger
 *
 * /set:
 *   tags:
 *     - Gestione Extra data Assistiti
 */

const {ERROR_TYPES} = require('../../../responses/ApiResponse');
module.exports = {
  friendlyName: 'Set extra data assistito',
  description: 'Imposta/aggiorna i dati extra di un assistito per una categoria, identificato tramite codice fiscale.',
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
    valori: {
      type: 'json',
      required: true,
      description: 'Oggetto chiave/valore da impostare (es. {cellulare: "333...", email: "..."})'
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

      // Parsing sicuro di valori (potrebbe arrivare come stringa da query string)
      if (typeof inputs.valori === 'string') {
        try { inputs.valori = JSON.parse(inputs.valori); } catch (e) {
          return this.res.ApiResponse({
            errType: ERROR_TYPES.BAD_REQUEST,
            errMsg: 'Il campo valori deve essere un oggetto JSON valido'
          });
        }
      }

      if (!sails.helpers.scopeMatches(userScopi, cat.scopoScrittura)) {
        return this.res.ApiResponse({
          errType: ERROR_TYPES.NON_AUTORIZZATO,
          errMsg: 'Non hai i permessi di scrittura per questa categoria'
        });
      }

      const campiDef = cat.campi || [];
      const chiaviValide = campiDef.map(c => c.chiave);
      for (const chiave of Object.keys(inputs.valori)) {
        if (chiaviValide.length > 0 && !chiaviValide.includes(chiave)) {
          return this.res.ApiResponse({
            errType: ERROR_TYPES.BAD_REQUEST,
            errMsg: `Campo '${chiave}' non valido per la categoria ${cat.codice}. Campi ammessi: ${chiaviValide.join(', ')}`
          });
        }
      }

      for (const campo of campiDef) {
        if (campo.obbligatorio && inputs.valori[campo.chiave] !== undefined && !inputs.valori[campo.chiave]) {
          return this.res.ApiResponse({
            errType: ERROR_TYPES.BAD_REQUEST,
            errMsg: `Il campo '${campo.chiave}' è obbligatorio e non può essere vuoto`
          });
        }
      }

      // Validazione schema per campi di tipo json
      for (const [chiave, valore] of Object.entries(inputs.valori)) {
        const campoDef = campiDef.find(c => c.chiave === chiave);
        if (campoDef && campoDef.tipo === 'json' && campoDef.schema) {
          const result = sails.helpers.validateExtraDataJson(valore, campoDef.schema);
          if (!result.valid) {
            return this.res.ApiResponse({
              errType: ERROR_TYPES.BAD_REQUEST,
              errMsg: `Validazione fallita per il campo '${chiave}': ${result.errors.join('; ')}`
            });
          }
        }
      }

      const risultati = [];

      for (const [chiave, nuovoValore] of Object.entries(inputs.valori)) {
        const existing = await Anagrafica_ExtraDataValori.findOne({
          assistito: assistito.id,
          categoria: cat.id,
          chiave
        });

        if (existing) {
          const vecchioValore = existing.valore;
          await Anagrafica_ExtraDataValori.updateOne({ id: existing.id }).set({ valore: nuovoValore });
          await Anagrafica_ExtraDataStorico.create({
            valore: existing.id,
            vecchioValore,
            nuovoValore,
            operazione: 'UPDATE',
            utente: username,
            ipAddress
          });
          risultati.push({ chiave, operazione: 'UPDATE' });
        } else {
          const created = await Anagrafica_ExtraDataValori.create({
            assistito: assistito.id,
            categoria: cat.id,
            chiave,
            valore: nuovoValore
          }).fetch();
          await Anagrafica_ExtraDataStorico.create({
            valore: created.id,
            vecchioValore: null,
            nuovoValore,
            operazione: 'CREATE',
            utente: username,
            ipAddress
          });
          risultati.push({ chiave, operazione: 'CREATE' });
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
      sails.log.error('Error setting extra data:', error);
      return this.res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: 'Errore durante il salvataggio dei dati extra'
      });
    }
  }
};
