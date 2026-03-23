module.exports = {
  friendlyName: 'Get extra data for assistiti',

  description: 'Recupera i dati extra per un elenco di assistiti, filtrati per scope utente.',

  inputs: {
    assistitoIds: {
      type: 'ref',
      required: true,
      description: 'Array di ID assistiti'
    },
    userScopi: {
      type: 'ref',
      required: true,
      description: 'Array di scope dell\'utente'
    }
  },

  fn: async function (inputs, exits) {
    const { assistitoIds, userScopi } = inputs;

    if (!assistitoIds || assistitoIds.length === 0) {
      return exits.success({});
    }

    // Fetch categorie attive
    const categorie = await Anagrafica_ExtraDataCategorie.find({ attivo: true });

    // Filtra solo quelle leggibili dall'utente
    const categorieLeggibili = categorie.filter(cat =>
      sails.helpers.scopeMatches(userScopi, cat.scopoLettura)
    );

    if (categorieLeggibili.length === 0) {
      return exits.success({});
    }

    const categorieIds = categorieLeggibili.map(c => c.id);

    // Fetch valori per gli assistiti e categorie leggibili
    const valori = await Anagrafica_ExtraDataValori.find({
      where: {
        assistito: { in: assistitoIds },
        categoria: { in: categorieIds }
      }
    });

    // Mappa categorieId -> codice per lookup veloce
    const catMap = {};
    for (const cat of categorieLeggibili) {
      catMap[cat.id] = cat.codice;
    }

    // Raggruppa per assistito -> categoria -> chiave/valore
    const result = {};
    for (const val of valori) {
      const aId = val.assistito;
      const catCodice = catMap[val.categoria];
      if (!catCodice) continue;

      if (!result[aId]) result[aId] = {};
      if (!result[aId][catCodice]) result[aId][catCodice] = {};
      result[aId][catCodice][val.chiave] = val.valore;
    }

    return exits.success(result);
  }
};
