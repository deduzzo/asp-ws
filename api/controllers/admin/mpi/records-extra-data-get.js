module.exports = {
  friendlyName: 'Get extra data record MPI (admin)',
  description: 'Recupera tutti i dati extra di un record MPI con le definizioni dei campi. Nessun filtro scope (admin).',
  swagger: false,
  inputs: {
    mpiId: {
      type: 'string',
      required: true,
      description: 'UUID del record MPI'
    }
  },
  fn: async function (inputs, exits) {
    try {
      const record = await Anagrafica_MpiRecord.findOne({mpiId: inputs.mpiId});
      if (!record) {
        return this.res.ApiResponse({
          errType: 'NOT_FOUND',
          errMsg: 'Record MPI non trovato'
        });
      }

      // Tutte le categorie attive (admin vede tutto)
      const categorie = await Anagrafica_ExtraDataCategorie.find({where: {attivo: true}, sort: 'codice ASC'});

      // Tutti i valori per questo record MPI
      const valori = await Anagrafica_MpiExtraDataValori.find({
        where: {mpiRecord: record.id}
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
          mpiId: record.mpiId,
          mpiRecordId: record.id,
          categorie: result
        }
      });
    } catch (error) {
      sails.log.error('Error getting MPI extra data (admin):', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante il recupero dei dati extra'
      });
    }
  }
};
