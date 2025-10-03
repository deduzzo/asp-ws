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
   * @param {boolean} [configParams.addSituazioneMedico=false] - Se `true`, include la situazione del medico.
   * @return {Promise<Object>} - Una promessa che risolve un array di oggetti medico.
   */
  getMedici: async function (configParams = {}) {
    let {
      tipoMedico = [MMG, PLS],
      soloAttivi = true,
      nascondiCessati = true,
      addSituazioneMedico = false
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
    if (data.ok && addSituazioneMedico) {

      const numParallels = 30; // Numero massimo di richieste parallele
      const chunks = [];
      for (let i = 0; i < data.data.length; i += numParallels) {
        chunks.push(data.data.slice(i, i + numParallels));
      }
      for (const chunk of chunks) {
        await Promise.all(chunk.map(async riga => {
          let situazione = await nar2.getNumAssistitiMedico(riga.pf_id);
          riga.situazioneMedico = situazione.ok ? situazione.data : null;
        }));
      }

      return data.data;
    }
    return data;
  },
  getSituazioniAssistenzialiAssistito: async function (cfAssistito, includeFullData = false) {
    let impostazioniServizi = new ImpostazioniServiziTerzi(configData);
    let nar2 = new Nar2(impostazioniServizi, {...keys});
    return await nar2.getSituazioniAssistenziali(cfAssistito, includeFullData);
  },
  async getAmbitiDomicilioAssistito(cfAssistito, situazioneAssistenziale = 4) {
    let impostazioniServizi = new ImpostazioniServiziTerzi(configData);
    let nar2 = new Nar2(impostazioniServizi, {...keys});
    return await nar2.getAmbitiDomicilioAssistito(cfAssistito, situazioneAssistenziale);
  },
  getMediciPerAssistito: async function (cfAssistito, idAmbito, tipoMedico = Nar2.MEDICO_DI_BASE) {
    let impostazioniServizi = new ImpostazioniServiziTerzi(configData);
    let nar2 = new Nar2(impostazioniServizi, {...keys});
    return await nar2.getMediciByAmbito(idAmbito, cfAssistito, tipoMedico);
  },
  getSituazioneMedico: async function (pf_id) {
    let impostazioniServizi = new ImpostazioniServiziTerzi(configData);
    let nar2 = new Nar2(impostazioniServizi, {...keys});
    return await nar2.getNumAssistitiMedico(pf_id);
  }


};
