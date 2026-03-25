module.exports = {
  friendlyName: 'Get extra data for MPI records',

  description: 'Recupera i dati extra per un elenco di record MPI, filtrati per scope utente.',

  inputs: {
    mpiRecordIds: {
      type: 'ref',
      required: true,
      description: 'Array di ID record MPI'
    },
    userScopi: {
      type: 'ref',
      required: true,
      description: 'Array di scope dell\'utente'
    }
  },

  fn: async function (inputs, exits) {
    const {mpiRecordIds, userScopi} = inputs;

    if (!mpiRecordIds || mpiRecordIds.length === 0) {
      return exits.success({});
    }

    const categorie = await Anagrafica_ExtraDataCategorie.find({attivo: true});

    const categorieLeggibili = categorie.filter(cat =>
      sails.helpers.scopeMatches(userScopi, cat.scopoLettura)
    );

    if (categorieLeggibili.length === 0) {
      return exits.success({});
    }

    const categorieIds = categorieLeggibili.map(c => c.id);

    const valori = await Anagrafica_MpiExtraDataValori.find({
      where: {
        mpiRecord: {in: mpiRecordIds},
        categoria: {in: categorieIds}
      }
    });

    const catMap = {};
    for (const cat of categorieLeggibili) {
      catMap[cat.id] = cat.codice;
    }

    const result = {};
    for (const val of valori) {
      const rId = val.mpiRecord;
      const catCodice = catMap[val.categoria];
      if (!catCodice) continue;

      if (!result[rId]) result[rId] = {};
      if (!result[rId][catCodice]) result[rId][catCodice] = {};
      result[rId][catCodice][val.chiave] = val.valore;
    }

    return exits.success(result);
  }
};
