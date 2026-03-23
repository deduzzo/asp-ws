module.exports = {
  friendlyName: 'List extra data categorie',
  description: 'Elenco delle categorie di dati extra.',
  swagger: false,
  inputs: {},
  fn: async function (inputs, exits) {
    try {
      const categorie = await Anagrafica_ExtraDataCategorie.find({
        sort: 'codice ASC'
      });

      // Assicura che campi sia sempre un oggetto parsato
      const categorieOut = categorie.map(cat => {
        let campi = cat.campi;
        if (typeof campi === 'string') {
          try { campi = JSON.parse(campi); } catch (e) { campi = []; }
        }
        return { ...cat, campi: campi || [] };
      });

      return this.res.ApiResponse({
        data: { categorie: categorieOut }
      });
    } catch (error) {
      sails.log.error('Error listing extra data categorie:', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante il recupero delle categorie'
      });
    }
  }
};
