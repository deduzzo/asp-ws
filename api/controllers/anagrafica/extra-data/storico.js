/**
 * @swagger
 *
 * /storico:
 *   tags:
 *     - Gestione Extra data Assistiti
 */

const {ERROR_TYPES} = require('../../../responses/ApiResponse');

module.exports = {
  friendlyName: 'Storico extra data assistito',
  description: 'Recupera lo storico delle modifiche ai dati extra di un assistito, identificato tramite codice fiscale.',
  inputs: {
    cf: {
      type: 'string',
      required: true,
      description: 'Codice fiscale o STP dell\'assistito'
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
      const userScopi = (this.req.tokenData && this.req.tokenData.scopi) || [];
      const skip = (inputs.page - 1) * inputs.limit;

      const assistito = await Anagrafica_Assistiti.findOne({ cf: inputs.cf.toUpperCase() });
      if (!assistito) {
        return this.res.ApiResponse({
          errType: ERROR_TYPES.NOT_FOUND,
          errMsg: 'Assistito non trovato'
        });
      }

      const categorie = await Anagrafica_ExtraDataCategorie.find({ attivo: true });
      const categorieLeggibili = categorie.filter(cat => sails.helpers.scopeMatches(userScopi, cat.scopoLettura));

      if (categorieLeggibili.length === 0) {
        return this.res.ApiResponse({
          data: { storico: [], pagination: { page: inputs.page, limit: inputs.limit, total: 0, pages: 0 } }
        });
      }

      let categorieIds = categorieLeggibili.map(c => c.id);

      if (inputs.categoria) {
        const cat = categorieLeggibili.find(c => c.codice === inputs.categoria.toUpperCase());
        if (!cat) {
          return this.res.ApiResponse({
            errType: ERROR_TYPES.NOT_FOUND,
            errMsg: 'Categoria non trovata o non hai i permessi di lettura'
          });
        }
        categorieIds = [cat.id];
      }

      const valori = await Anagrafica_ExtraDataValori.find({
        where: {
          assistito: assistito.id,
          categoria: { in: categorieIds }
        }
      });

      if (valori.length === 0) {
        return this.res.ApiResponse({
          data: { storico: [], pagination: { page: inputs.page, limit: inputs.limit, total: 0, pages: 0 } }
        });
      }

      const valoriIds = valori.map(v => v.id);
      const valoriMap = {};
      const catMap = {};
      for (const cat of categorieLeggibili) { catMap[cat.id] = cat.codice; }
      for (const v of valori) { valoriMap[v.id] = { chiave: v.chiave, categoria: catMap[v.categoria] }; }

      const totalCount = await Anagrafica_ExtraDataStorico.count({ valore: { in: valoriIds } });

      const storico = await Anagrafica_ExtraDataStorico.find({
        where: { valore: { in: valoriIds } },
        sort: 'createdAt DESC',
        skip,
        limit: inputs.limit
      });

      const storicoArricchito = storico.map(s => ({
        ...s,
        chiave: valoriMap[s.valore] ? valoriMap[s.valore].chiave : null,
        categoriaCode: valoriMap[s.valore] ? valoriMap[s.valore].categoria : null
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
      sails.log.error('Error getting extra data storico:', error);
      return this.res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: 'Errore durante il recupero dello storico'
      });
    }
  }
};
