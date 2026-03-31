module.exports = {
  friendlyName: 'Set extra data record MPI (admin)',
  description: 'Imposta/aggiorna i dati extra di un record MPI. Admin bypassa il controllo scope categoria.',
  swagger: false,
  inputs: {
    mpiId: {
      type: 'string',
      required: true
    },
    categoria: {
      type: 'string',
      required: true,
      description: 'Codice della categoria'
    },
    valori: {
      type: 'json',
      required: true,
      description: 'Oggetto chiave/valore'
    }
  },
  fn: async function (inputs, exits) {
    try {
      const username = this.req.user;
      const ipAddress = this.req.ip;

      const record = await Anagrafica_MpiRecord.findOne({mpiId: inputs.mpiId});
      if (!record) {
        return this.res.ApiResponse({errType: 'NOT_FOUND', errMsg: 'Record MPI non trovato'});
      }

      const cat = await Anagrafica_ExtraDataCategorie.findOne({codice: inputs.categoria.toUpperCase(), attivo: true});
      if (!cat) {
        return this.res.ApiResponse({errType: 'NOT_FOUND', errMsg: 'Categoria non trovata o non attiva'});
      }

      if (typeof inputs.valori === 'string') {
        try { inputs.valori = JSON.parse(inputs.valori); } catch (e) {
          return this.res.ApiResponse({errType: 'BAD_REQUEST', errMsg: 'Il campo valori deve essere un oggetto JSON valido'});
        }
      }

      // Validazione campi
      const campiDef = cat.campi || [];
      const chiaviValide = campiDef.map(c => c.chiave);
      for (const chiave of Object.keys(inputs.valori)) {
        if (chiaviValide.length > 0 && !chiaviValide.includes(chiave)) {
          return this.res.ApiResponse({
            errType: 'BAD_REQUEST',
            errMsg: `Campo '${chiave}' non valido per la categoria ${cat.codice}. Campi ammessi: ${chiaviValide.join(', ')}`
          });
        }
      }

      // Validazione schema JSON
      for (const [chiave, valore] of Object.entries(inputs.valori)) {
        const campoDef = campiDef.find(c => c.chiave === chiave);
        if (campoDef && campoDef.tipo === 'json' && campoDef.schema) {
          const result = sails.helpers.validateExtraDataJson(valore, campoDef.schema);
          if (!result.valid) {
            return this.res.ApiResponse({
              errType: 'BAD_REQUEST',
              errMsg: `Validazione fallita per il campo '${chiave}': ${result.errors.join('; ')}`
            });
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
            valore: existing.id,
            vecchioValore,
            nuovoValore,
            operazione: 'UPDATE',
            utente: username,
            ipAddress
          });
          risultati.push({chiave, operazione: 'UPDATE'});
        } else {
          const created = await Anagrafica_MpiExtraDataValori.create({
            mpiRecord: record.id,
            categoria: cat.id,
            chiave,
            valore: nuovoValore
          }).fetch();
          await Anagrafica_MpiExtraDataStorico.create({
            valore: created.id,
            vecchioValore: null,
            nuovoValore,
            operazione: 'CREATE',
            utente: username,
            ipAddress
          });
          risultati.push({chiave, operazione: 'CREATE'});
        }
      }

      return this.res.ApiResponse({
        data: {mpiId: inputs.mpiId, categoria: cat.codice, risultati}
      });
    } catch (error) {
      sails.log.error('Error setting MPI extra data (admin):', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante il salvataggio dei dati extra'
      });
    }
  }
};
