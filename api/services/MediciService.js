const configData = require('../../config/custom/private_nar_ts_config.json');
const keys = require('../../config/custom/private_encrypt_key.json');
const {ImpostazioniServiziTerzi} = require('aziendasanitaria-utils/src/config/ImpostazioniServiziTerzi.js');
const {Nar2} = require('aziendasanitaria-utils/src/narTsServices/Nar2.js');
const MMG = 'MMG';
const PLS = 'PLS';
module.exports = {
  /**
   * Recupera un elenco di medici in base ai parametri di configurazione forniti.
   *
   * @async
   * @function getMedici
   * @param {Object} [configParams={}] - Parametri di configurazione per il filtro dei medici.
   * @param {string[]} [configParams.tipoMedico=[MMG, PLS]] - Tipologia di medico da includere (MMG, PLS o entrambi).
   * @param {boolean} [configParams.soloAttivi=true] - Se `true`, restituisce solo i medici attivi.
   * @param {boolean} [configParams.nascondiCessati=true] - Se `true`, esclude i medici cessati.
   * @returns {Promise<Object[]|[]>} - Restituisce un array di medici o un array vuoto in caso di errore.
   */
  getMedici: async function (configParams = {}) {
    let {
      tipoMedico = [MMG, PLS],
      soloAttivi = true,
      nascondiCessati = true,
    } = configParams;
    let impostazioniServizi = new ImpostazioniServiziTerzi(configData);
    let nar2 = new Nar2(impostazioniServizi, {...keys});
    let config = {};
    if (!tipoMedico.includes('MMG') && tipoMedico.includes('PLS')) {
      config.soloPediatri = true;
    } else if (tipoMedico.includes('MMG') && !tipoMedico.includes('PLS')) {
      config.soloMMG = true;
    }
    if (soloAttivi) {
      config.soloAttivi = true;
    }
    if (nascondiCessati) {
      config.nascondiCessati = true;
    }
    let data = await nar2.getMediciFromNar2(config);
    if (data.ok) {
      return data;
    } else {
      return [];
    }
  },
  getMediciPerAssistito: async function (cfAssistito) {

};
