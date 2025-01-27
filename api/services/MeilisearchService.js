const { MeiliSearch } = require('meilisearch');
const configData = require('../../config/private_meilisearch_config.json');
module.exports = {
  getClient: function() {
    return new MeiliSearch({
      host: 'https://search.robertodedomenico.it',
      apiKey: configData.MEILILI_MASTER_KEY
    });
  }
};
