const {MeiliSearch} = require('meilisearch');
const configData = require('../../config/custom/private_index.json');


const client = new MeiliSearch({
  host: 'https://search.robertodedomenico.it',
  apiKey: configData.MEILILI_MASTER_KEY
});

module.exports = {
  ASSISTITI_INDEX: 'assistiti_index',
  SEARCH_FILTER_ATTRIBUTES: ['cf', 'nome', 'cognome', 'dataNascita', 'fullText'],
  SORTABLE_ATTRIBUTES: ['cf', 'nome', 'cognome'],
  getOrCreateIndex: async (updateSettings = false) => {
    let error = false;
    try {
      const index = await client.getIndex(module.exports.ASSISTITI_INDEX);
      if (updateSettings) {
        await module.exports.updateSettings();
      }
      return index;
    } catch (err) {
      if (err.message.toLowerCase().includes('not found')) {
        await client.createIndex(module.exports.ASSISTITI_INDEX, {
          primaryKey: 'cf'
        });
        await this.updateSettings();
        return await client.getIndex(module.exports.ASSISTITI_INDEX);
      }
      throw err;
    }
  },

  updateSettings: async (settings) => {
    await client.index(module.exports.ASSISTITI_INDEX).updateSettings({
      searchableAttributes: module.exports.SEARCH_FILTER_ATTRIBUTES,
      filterableAttributes: module.exports.SEARCH_FILTER_ATTRIBUTES,
      sortableAttributes: module.exports.SORTABLE_ATTRIBUTES,
      typoTolerance: {
        enabled: false,
        minWordSizeForTypos: {
          oneTypo: 5,  // Permetti un typo per parole >=3 caratteri
          twoTypos: 8  // Permetti due typo per parole >=6 caratteri
        }
      },
      rankingRules: [
        'exactness',   // Dai priorità ai match esatti
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort'
      ]
    });
  },

  addDocument: async (document) => {
    try {
      const index = await module.exports.getOrCreateIndex();
      await index.addDocuments([document]);
      return true;
    } catch (err) {
      sails.log.error('Errore durante l\'aggiunta del documento a MeiliSearch:', err);
      throw err;
    }
  },

  updateDocument: async (document) => {
    try {
      const index = await module.exports.getOrCreateIndex();
      await index.updateDocuments([document]);
      return true;
    } catch (err) {
      sails.log.error('Errore durante l\'aggiornamento del documento in MeiliSearch:', err);
      throw err;
    }
  },

  deleteDocument: async (documentId) => {
    try {
      const index = await module.exports.getOrCreateIndex();
      await index.deleteDocument(documentId);
      return true;
    } catch (err) {
      sails.log.error('Errore durante l\'eliminazione del documento da MeiliSearch:', err);
      throw err;
    }
  },

  deleteIndex: async () => {
    try {
      await client.deleteIndex(module.exports.ASSISTITI_INDEX);
      return true;
    } catch (err) {
      sails.log.error('Errore durante l\'eliminazione dell\'indice MeiliSearch:', err);
      throw err;
    }
  },
  // Metodo di utilità per cercare per CF esatto
  findFromCf: async (cf) => {
    try {
      const index = await module.exports.getOrCreateIndex();
      const results = await index.search(cf, {
        filter: [`cf = "${cf}"`],
        limit: 1
      });
      return results.hits;
    } catch (err) {
      sails.log.error('Errore durante la ricerca per CF:', err);
      throw err;
    }
  },
  search: async (query, options = {}) => {
    try {
      const index = await module.exports.getOrCreateIndex();

      const results = await index.search(query, {
          sort: options.sort || ['cognome:asc', 'nome:asc'],
          matchingStrategy: 'all',
          limit: 20
        }
      );


      return results;
    } catch (err) {
      sails.log.error('Errore durante la ricerca:', err);
      throw err;
    }
  },
};
