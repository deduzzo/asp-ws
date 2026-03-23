module.exports = {
  friendlyName: 'Storico extra data assistito (admin)',
  description: 'Recupera lo storico completo delle modifiche ai dati extra di un assistito. Admin vede tutto.',
  swagger: false,
  inputs: {
    assistitoId: {
      type: 'number',
      required: true
    },
    categoria: {
      type: 'string',
      description: 'Codice categoria per filtrare (opzionale)'
    },
    page: {
      type: 'number',
      defaultsTo: 1
    },
    limit: {
      type: 'number',
      defaultsTo: 50
    }
  },
  fn: async function (inputs, exits) {
    try {
      const skip = (inputs.page - 1) * inputs.limit;

      const categorie = await Anagrafica_ExtraDataCategorie.find();
      const catMap = {};
      categorie.forEach(c => { catMap[c.id] = c.codice; });

      let categorieIds = categorie.map(c => c.id);

      if (inputs.categoria) {
        const cat = categorie.find(c => c.codice === inputs.categoria.toUpperCase());
        if (!cat) {
          return this.res.ApiResponse({ errType: 'NOT_FOUND', errMsg: 'Categoria non trovata' });
        }
        categorieIds = [cat.id];
      }

      // Trova tutti i valori (anche eliminati tramite storico)
      const valori = await Anagrafica_ExtraDataValori.find({
        where: { assistito: inputs.assistitoId, categoria: { in: categorieIds } }
      });

      const valoriIds = valori.map(v => v.id);

      if (valoriIds.length === 0) {
        return this.res.ApiResponse({
          data: { storico: [], pagination: { page: inputs.page, limit: inputs.limit, total: 0, pages: 0 } }
        });
      }

      const valoriMap = {};
      valori.forEach(v => { valoriMap[v.id] = { chiave: v.chiave, categoria: catMap[v.categoria] }; });

      const totalCount = await Anagrafica_ExtraDataStorico.count({ valore: { in: valoriIds } });

      const storico = await Anagrafica_ExtraDataStorico.find({
        where: { valore: { in: valoriIds } },
        sort: 'createdAt DESC',
        skip,
        limit: inputs.limit
      });

      const storicoArricchito = storico.map(s => ({
        id: s.id,
        chiave: valoriMap[s.valore] ? valoriMap[s.valore].chiave : '(eliminato)',
        categoria: valoriMap[s.valore] ? valoriMap[s.valore].categoria : '?',
        vecchioValore: s.vecchioValore,
        nuovoValore: s.nuovoValore,
        operazione: s.operazione,
        utente: s.utente,
        ipAddress: s.ipAddress,
        createdAt: s.createdAt
      }));

      return this.res.ApiResponse({
        data: {
          storico: storicoArricchito,
          pagination: {
            page: inputs.page,
            limit: inputs.limit,
            total: totalCount,
            pages: Math.ceil(totalCount / inputs.limit)
          }
        }
      });
    } catch (error) {
      sails.log.error('Error getting extra data storico (admin):', error);
      return this.res.ApiResponse({ errType: 'INTERNAL_ERROR', errMsg: 'Errore durante il recupero dello storico' });
    }
  }
};
