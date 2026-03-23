module.exports = {
  friendlyName: 'Get extra data assistito (admin)',
  description: 'Recupera tutti i dati extra di un assistito con le definizioni dei campi. Nessun filtro scope (admin).',
  swagger: false,
  inputs: {
    assistitoId: {
      type: 'number',
      required: true,
      description: 'ID dell\'assistito'
    }
  },
  fn: async function (inputs, exits) {
    try {
      const assistito = await Anagrafica_Assistiti.findOne({ id: inputs.assistitoId });
      if (!assistito) {
        return this.res.ApiResponse({
          errType: 'NOT_FOUND',
          errMsg: 'Assistito non trovato'
        });
      }

      // Tutte le categorie attive (admin vede tutto)
      const categorie = await Anagrafica_ExtraDataCategorie.find({ where: { attivo: true }, sort: 'codice ASC' });

      // Tutti i valori per questo assistito
      const valori = await Anagrafica_ExtraDataValori.find({
        where: { assistito: inputs.assistitoId }
      });

      // Costruisci risposta con definizione campi e valori correnti
      const result = categorie.map(cat => {
        const valoriCat = valori.filter(v => v.categoria === cat.id);
        const valoriMap = {};
        valoriCat.forEach(v => { valoriMap[v.chiave] = v.valore; });

        let campi = cat.campi;
        if (typeof campi === 'string') {
          try { campi = JSON.parse(campi); } catch (e) { campi = []; }
        }

        return {
          id: cat.id,
          codice: cat.codice,
          descrizione: cat.descrizione,
          campi: campi || [],
          valori: valoriMap
        };
      });

      return this.res.ApiResponse({
        data: {
          assistito: {
            id: assistito.id,
            cf: assistito.cf,
            nome: assistito.nome,
            cognome: assistito.cognome
          },
          categorie: result
        }
      });
    } catch (error) {
      sails.log.error('Error getting extra data (admin):', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante il recupero dei dati extra'
      });
    }
  }
};
