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

      const numParallels = 100; // Numero massimo di richieste parallele
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
  },

  /**
   * Restituisce le situazioni assistenziali AMMESSE per la scelta del medico
   * (endpoint NAR2 /getOnlySitAss). Diverso da getSituazioniAssistenzialiAssistito,
   * che ritorna lo storico (sitAss_) del paziente-medico.
   *
   * @param {string} cfAssistito
   * @param {Object} [config]
   * @param {string|number|null} [config.pmId=null]
   * @param {string} [config.tipoMedico="M"]
   * @returns {Promise<{ok, data: Array|null}>}
   */
  getSituazioniAssistenzialiAmmesse: async function (cfAssistito, config = {}) {
    const impostazioniServizi = new ImpostazioniServiziTerzi(configData);
    const nar2 = new Nar2(impostazioniServizi, {...keys});
    return await nar2.getSituazioniAssistenzialiAmmesse(cfAssistito, config);
  },

  /**
   * Restituisce le categorie cittadino (sc_id) ammesse per una sa_id.
   *
   * @param {string|number} saId
   * @returns {Promise<{ok, data: string[]|null}>}
   */
  getCategorieCittadinoBySituazione: async function (saId) {
    const impostazioniServizi = new ImpostazioniServiziTerzi(configData);
    const nar2 = new Nar2(impostazioniServizi, {...keys});
    return await nar2.getCategorieCittadinoBySituazione(saId);
  },

  /**
   * Ricerca ambiti via autocomplete NAR2.
   *
   * @param {string} searchKey
   * @param {Object} [config]
   * @param {string|number} [config.azienda]
   * @param {string} [config.tipo]
   * @returns {Promise<{ok, data: Array|null}>}
   */
  searchAmbitiAutocomplete: async function (searchKey, config = {}) {
    const impostazioniServizi = new ImpostazioniServiziTerzi(configData);
    const nar2 = new Nar2(impostazioniServizi, {...keys});
    return await nar2.searchAmbitiAutocomplete(searchKey, config);
  },

  /**
   * Ricerca medici per ambito via autocomplete NAR2.
   *
   * @param {string|number} idAmbito
   * @param {string} cfAssistito
   * @param {string} searchKey
   * @param {Object} [config]
   * @returns {Promise<{ok, data: Array|null}>}
   */
  searchMediciByAmbitoAutocomplete: async function (idAmbito, cfAssistito, searchKey, config = {}) {
    const impostazioniServizi = new ImpostazioniServiziTerzi(configData);
    const nar2 = new Nar2(impostazioniServizi, {...keys});
    return await nar2.searchMediciByAmbitoAutocomplete(idAmbito, cfAssistito, searchKey, config);
  },

  /**
   * Effettua il cambio medico su NAR2 (POST /pazienti/sceltaMedico).
   * Wrappa nar2.aggiornaCambioMedico — di default dryRun=true.
   *
   * @param {string} cfAssistito
   * @param {number|string} pfIdMedico - pf_id del medico scelto
   * @param {Object} [config]
   * @returns {Promise<{ok, dryRun, payload, response, data, error}>}
   */
  effettuaCambioMedico: async function (cfAssistito, pfIdMedico, config = {}) {
    const impostazioniServizi = new ImpostazioniServiziTerzi(configData);
    const nar2 = new Nar2(impostazioniServizi, {...keys});
    return await nar2.aggiornaCambioMedico(cfAssistito, pfIdMedico, config);
  },

  /**
   * Verifica lo stato del medico assegnato a un assistito leggendo da NAR2 e TS in parallelo.
   * Restituisce i due snapshot e l'esito di coerenza.
   *
   * @param {string} cfAssistito
   * @param {Object} [atteso] Eventuali valori attesi per il match
   * @param {string|number} [atteso.pfId]
   * @param {string} [atteso.codReg]
   * @param {string} [atteso.cfMedico]
   * @returns {Promise<{ok, cf, nar2, ts, coerenti, matchAtteso, divergenza}>}
   */
  verificaCambioMedico: async function (cfAssistito, atteso = null) {
    const impostazioniServizi = new ImpostazioniServiziTerzi(configData);
    const nar2 = new Nar2(impostazioniServizi, {...keys});

    const assistito = await nar2.getDatiAssistitoCompleti(cfAssistito, {
      sogei: true,
      nar2: true,
      dateToUnix: false
    });

    const fromNar2 = assistito.fromNar2 || {};
    const fromTs = assistito.fromTs || {};

    const upper = (v) => (v === null || v === undefined ? null : String(v).toUpperCase());

    const buildMedico = (snap) => ({
      cfMedico: snap.MMGCf || null,
      codReg: snap.MMGCodReg || null,
      cognome: snap.MMGCognome || null,
      nome: snap.MMGNome || null,
      tipo: snap.MMGTipo || null,
      ultimoStato: snap.MMGUltimoStato || null,
      ultimaOperazione: snap.MMGUltimaOperazione || null,
      dataScelta: snap.MMGDataScelta || null,
      dataRevoca: snap.MMGDataRevoca || null
    });

    const medicoNar2 = buildMedico(fromNar2);
    const medicoTs = buildMedico(fromTs);

    const nar2Ok = !!(medicoNar2.cfMedico || medicoNar2.codReg);
    const tsOk = !!(medicoTs.cfMedico || medicoTs.codReg);

    // Coerenza: confronto CF (case-insensitive) come fonte primaria.
    // Cadiamo su codReg solo quando ALMENO una delle due fonti non ha CF disponibile.
    let coerenti = false;
    if (nar2Ok && tsOk) {
      const cfA = upper(medicoNar2.cfMedico);
      const cfB = upper(medicoTs.cfMedico);
      if (cfA && cfB) {
        coerenti = cfA === cfB;
      } else if (medicoNar2.codReg && medicoTs.codReg) {
        coerenti = String(medicoNar2.codReg) === String(medicoTs.codReg);
      }
    }

    let matchAtteso = null;
    if (atteso && (atteso.codReg || atteso.cfMedico)) {
      const cfAtteso = upper(atteso.cfMedico);
      const codRegAtteso = (atteso.codReg !== null && atteso.codReg !== undefined) ? String(atteso.codReg) : null;
      const matches = (m) => {
        const mCf = upper(m.cfMedico);
        // Stessa regola della coerenza: CF è prioritario; codReg solo se CF mancante in una delle due parti
        if (cfAtteso && mCf) {return cfAtteso === mCf;}
        if (codRegAtteso && m.codReg) {return codRegAtteso === String(m.codReg);}
        return false;
      };
      matchAtteso = {
        nar2: matches(medicoNar2),
        ts: matches(medicoTs)
      };
    }

    let divergenza = null;
    if (!nar2Ok && !tsOk) {
      divergenza = 'errore';
    } else if (!nar2Ok) {
      divergenza = 'nar2_non_aggiornato';
    } else if (!tsOk) {
      divergenza = 'ts_non_aggiornato';
    } else if (!coerenti) {
      divergenza = 'medici_diversi';
    }

    return {
      ok: true,
      cf: cfAssistito,
      nar2: {
        ok: nar2Ok,
        medico: medicoNar2,
        errore: assistito.erroreNar2 || null
      },
      ts: {
        ok: tsOk,
        medico: medicoTs,
        errore: assistito.erroreTs || null
      },
      coerenti,
      matchAtteso,
      divergenza
    };
  }


};
