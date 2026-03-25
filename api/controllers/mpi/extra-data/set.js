/**
 * @swagger
 *
 * /set:
 *   tags:
 *     - MPI Extra Data
 */

const {ERROR_TYPES} = require('../../../responses/ApiResponse');

module.exports = {
  friendlyName: 'MPI Extra Data Set',
  description: 'Imposta/aggiorna dati extra su un record MPI.',

  inputs: {
    mpiId: {type: 'string', required: true},
    categoria: {type: 'string', required: true},
    valori: {type: 'json', required: true},
  },

  fn: async function (inputs, exits) {
    const req = this.req;
    const res = this.res;

    try {
      const userScopi = req.tokenData.scopi;
      const username = req.tokenData.username;
      const ipAddress = req.ip;

      const record = await Anagrafica_MpiRecord.findOne({mpiId: inputs.mpiId})
        .populate('applicazione');

      if (!record) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_TROVATO, errMsg: 'Record MPI non trovato'});
      }

      if (record.stato === 'annullato') {
        return res.ApiResponse({errType: ERROR_TYPES.ERRORE_GENERICO, errMsg: 'Impossibile modificare dati extra su un record annullato'});
      }

      // Verifica scope write app
      const appCodice = record.applicazione.codice.toLowerCase();
      if (!await sails.helpers.scopeMatches(userScopi, `mpi-${appCodice}-write`)) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_AUTORIZZATO, errMsg: 'Non hai permessi di scrittura per questa app MPI'});
      }

      const cat = await Anagrafica_ExtraDataCategorie.findOne({codice: inputs.categoria.toUpperCase(), attivo: true});
      if (!cat) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_TROVATO, errMsg: 'Categoria non trovata o non attiva'});
      }

      // Parsing valori
      if (typeof inputs.valori === 'string') {
        try { inputs.valori = JSON.parse(inputs.valori); } catch (e) {
          return res.ApiResponse({errType: ERROR_TYPES.ERRORE_GENERICO, errMsg: 'Il campo valori deve essere un oggetto JSON valido'});
        }
      }

      // Verifica scope scrittura categoria
      if (!sails.helpers.scopeMatches(userScopi, cat.scopoScrittura)) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_AUTORIZZATO, errMsg: 'Non hai permessi di scrittura per questa categoria'});
      }

      // Validazione campi
      const campiDef = cat.campi || [];
      const chiaviValide = campiDef.map(c => c.chiave);
      for (const chiave of Object.keys(inputs.valori)) {
        if (chiaviValide.length > 0 && !chiaviValide.includes(chiave)) {
          return res.ApiResponse({errType: ERROR_TYPES.ERRORE_GENERICO, errMsg: `Campo '${chiave}' non valido per la categoria ${cat.codice}`});
        }
      }

      // Validazione schema JSON
      for (const [chiave, valore] of Object.entries(inputs.valori)) {
        const campoDef = campiDef.find(c => c.chiave === chiave);
        if (campoDef && campoDef.tipo === 'json' && campoDef.schema) {
          const result = sails.helpers.validateExtraDataJson(valore, campoDef.schema);
          if (!result.valid) {
            return res.ApiResponse({errType: ERROR_TYPES.ERRORE_GENERICO, errMsg: `Validazione fallita per '${chiave}': ${result.errors.join('; ')}`});
          }
        }
      }

      const risultati = [];

      for (const [chiave, nuovoValore] of Object.entries(inputs.valori)) {
        const existing = await Anagrafica_MpiExtraDataValori.findOne({
          mpiRecord: record.id,
          categoria: cat.id,
          chiave
        });

        if (existing) {
          const vecchioValore = existing.valore;
          await Anagrafica_MpiExtraDataValori.updateOne({id: existing.id}).set({valore: nuovoValore});
          await Anagrafica_MpiExtraDataStorico.create({
            valore: existing.id, vecchioValore, nuovoValore, operazione: 'UPDATE', utente: username, ipAddress
          });
          risultati.push({chiave, operazione: 'UPDATE'});
        } else {
          const created = await Anagrafica_MpiExtraDataValori.create({
            mpiRecord: record.id, categoria: cat.id, chiave, valore: nuovoValore
          }).fetch();
          await Anagrafica_MpiExtraDataStorico.create({
            valore: created.id, vecchioValore: null, nuovoValore, operazione: 'CREATE', utente: username, ipAddress
          });
          risultati.push({chiave, operazione: 'CREATE'});
        }
      }

      return res.ApiResponse({data: {mpiId: inputs.mpiId, categoria: cat.codice, risultati}});
    } catch (err) {
      sails.log.error('Errore MPI extra-data set:', err);
      return res.ApiResponse({errType: ERROR_TYPES.ERRORE_DEL_SERVER, errMsg: 'Errore durante il salvataggio dati extra'});
    }
  }
};
