//import configData from './config/config.json' assert { type: 'json' };
// convert this to require format
const configData = require('../../config/nar_ts_config.json');
const {ImpostazioniServiziTerzi} = require('aziendasanitaria-utils/src/config/ImpostazioniServiziTerzi');
const {Nar2} = require('aziendasanitaria-utils/src/narTsServices/Nar2');

module.exports = {
  getAssistitoFromCf: async function (cf) {
    let impostazioniServizi = new ImpostazioniServiziTerzi(configData);
    let nar2 = new Nar2(impostazioniServizi);
    let data = await nar2.getDatiAssistitoCompleti(cf, {dateToUnix: true});
    return data;
  }
}
