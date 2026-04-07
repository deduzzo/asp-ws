/**
 * @swagger
 *
 * /summary:
 *   tags:
 *     - Gestione Extra data Assistiti
 */

const JwtService = require('../../../services/JwtService');

module.exports = {
  friendlyName: 'Extra data categorie summary',
  description: 'Restituisce le categorie attive con la struttura dei campi. ' +
    'Senza token: mostra tutte le categorie. Con token: filtra per scope utente e indica canWrite.',
  inputs: {},
  fn: async function (inputs, exits) {
    try {
      // Token opzionale: se presente filtra per scope, altrimenti mostra tutto
      let userScopi = null;
      const authHeader = this.req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(authHeader.split(' ')[1], JwtService.getSecret());
          if (decoded && decoded.scopi) {
            userScopi = decoded.scopi;
          }
        } catch { /* token invalido/scaduto: tratta come pubblico */ }
      }

      const categorie = await Anagrafica_ExtraDataCategorie.find({
        where: { attivo: true },
        sort: 'codice ASC'
      });

      const result = {};
      categorie.forEach(cat => {
        // Se autenticato, filtra per scope di lettura
        if (userScopi !== null && !sails.helpers.scopeMatches(userScopi, cat.scopoLettura)) return;

        let campi = cat.campi;
        if (typeof campi === 'string') {
          try { campi = JSON.parse(campi); } catch (e) { campi = []; }
        }

        const canWrite = userScopi !== null
          ? sails.helpers.scopeMatches(userScopi, cat.scopoScrittura)
          : null;

        result[cat.codice] = {
          descrizione: cat.descrizione || null,
          scopoLettura: cat.scopoLettura,
          scopoScrittura: cat.scopoScrittura,
          canWrite,
          campi: (campi || []).map(c => ({
            chiave: c.chiave,
            tipo: c.tipo || 'string',
            obbligatorio: c.obbligatorio || false,
            etichetta: c.etichetta || c.chiave,
            note: c.note || null,
            esempio: c.esempio || null,
            schema: c.schema || null
          }))
        };
      });

      // Genera gruppi wildcard dalle categorie presenti
      const prefissi = {};
      categorie.forEach(cat => {
        // Estrai il prefisso dallo scope di lettura (es. "anagrafica_contatti-read" → "anagrafica")
        // oppure "clinico_allergie-read" → "clinico"
        const match = cat.scopoLettura.match(/^([a-z]+)_/);
        if (match) {
          const prefisso = match[1];
          if (!prefissi[prefisso]) {
            prefissi[prefisso] = { categorie: [], read: `${prefisso}_*-read`, write: `${prefisso}_*-write` };
          }
          prefissi[prefisso].categorie.push(cat.codice);
        }
      });

      const gruppi = {};
      for (const [prefisso, info] of Object.entries(prefissi)) {
        // Mostra il gruppo solo se ha più di una categoria
        if (info.categorie.length > 1) {
          gruppi[prefisso] = {
            descrizione: prefisso === 'anagrafica' ? 'Tutti i dati anagrafici' :
              prefisso === 'clinico' ? 'Tutti i dati clinici' :
                `Tutte le categorie ${prefisso}`,
            scopoLettura: info.read,
            scopoScrittura: info.write,
            categorie: info.categorie
          };
        }
      }
      // Gruppo globale
      gruppi['*'] = {
        descrizione: 'Tutte le categorie extra data',
        scopoLettura: '*-read',
        scopoScrittura: '*-write',
        categorie: categorie.map(c => c.codice)
      };

      return this.res.ApiResponse({
        data: {
          categorie: result,
          gruppi,
          scopeBase: 'asp5-anagrafica'
        }
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
