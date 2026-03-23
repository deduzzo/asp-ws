module.exports = {
  friendlyName: 'Set extra data assistito (admin)',
  description: 'Imposta/aggiorna i dati extra di un assistito per una categoria. Admin bypassa il controllo scope categoria.',
  swagger: false,
  inputs: {
    assistitoId: {
      type: 'number',
      required: true
    },
    categoria: {
      type: 'string',
      required: true,
      description: 'Codice della categoria (es. CONTATTI)'
    },
    valori: {
      type: 'json',
      required: true,
      description: 'Oggetto chiave/valore (es. {cellulare: "333...", email: "..."})'
    }
  },
  fn: async function (inputs, exits) {
    try {
      const username = this.req.user;
      const ipAddress = this.req.ip;

      const assistito = await Anagrafica_Assistiti.findOne({ id: inputs.assistitoId });
      if (!assistito) {
        return this.res.ApiResponse({
          errType: 'NOT_FOUND',
          errMsg: 'Assistito non trovato'
        });
      }

      const cat = await Anagrafica_ExtraDataCategorie.findOne({ codice: inputs.categoria.toUpperCase(), attivo: true });
      if (!cat) {
        return this.res.ApiResponse({
          errType: 'NOT_FOUND',
          errMsg: 'Categoria non trovata o non attiva'
        });
      }

      if (typeof inputs.valori === 'string') {
        try { inputs.valori = JSON.parse(inputs.valori); } catch (e) {
          return this.res.ApiResponse({ errType: 'BAD_REQUEST', errMsg: 'Il campo valori deve essere un oggetto JSON valido' });
        }
      }

      // Validazione campi e schema per campi di tipo json
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
        const existing = await Anagrafica_ExtraDataValori.findOne({
          assistito: inputs.assistitoId,
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
            assistito: inputs.assistitoId,
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
        data: { assistitoId: inputs.assistitoId, categoria: cat.codice, risultati }
      });
    } catch (error) {
      sails.log.error('Error setting extra data (admin):', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante il salvataggio dei dati extra'
      });
    }
  }
};
