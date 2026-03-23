/**
 * @swagger
 *
 * /summary:
 *   tags:
 *     - Gestione Extra data Assistiti
 */

module.exports = {
  friendlyName: 'Extra data categorie summary',
  description: 'Restituisce le categorie attive con la lista dei campi, filtrate per scope di lettura dell\'utente.',
  inputs: {},
  fn: async function (inputs, exits) {
    try {
      const userScopi = (this.req.tokenData && this.req.tokenData.scopi) || [];

      const categorie = await Anagrafica_ExtraDataCategorie.find({
        where: { attivo: true },
        sort: 'codice ASC'
      });

      // Filtra solo le categorie leggibili dall'utente
      const result = {};
      categorie.forEach(cat => {
        if (!sails.helpers.scopeMatches(userScopi, cat.scopoLettura)) return;

        let campi = cat.campi;
        if (typeof campi === 'string') {
          try { campi = JSON.parse(campi); } catch (e) { campi = []; }
        }
        result[cat.codice] = (campi || []).map(c => c.chiave);
      });

      return this.res.ApiResponse({
        data: result
      });
    } catch (error) {
      sails.log.error('Error getting extra data categorie summary:', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante il recupero delle categorie'
      });
    }
  }
};
