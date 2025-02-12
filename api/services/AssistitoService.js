
const configData = require('../../config/custom/private_nar_ts_config.json');

module.exports = {
  getAssistitoFromCf: async function (cf) {
    const {ImpostazioniServiziTerzi} = await import('aziendasanitaria-utils/src/config/ImpostazioniServiziTerzi.js');
    const {Nar2} = await import('aziendasanitaria-utils/src/narTsServices/Nar2.js');
    let impostazioniServizi = new ImpostazioniServiziTerzi(configData);
    let nar2 = new Nar2(impostazioniServizi);
    let data = await nar2.getDatiAssistitoCompleti(cf,{fallback:true});
    if (data.ok)
      return data.dati({dateToUnix:true});
    else
      return null;
  }
}
