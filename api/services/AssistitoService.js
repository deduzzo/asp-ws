const axios = require('axios');
const configData = require('../../config/custom/private_nar_ts_config.json');
const keys = require('../../config/custom/private_encrypt_key.json');
const NOMINATIM_URL = 'https://nominatim.app.robertodedomenico.it/search.php';
const NOMINATIM_OFFICIAL = 'https://nominatim.openstreetmap.org/search.php';
const NOMINATIM_HEADERS = {headers: {'User-Agent': 'ASP-Messina-WS/1.0 (assistiti-geocoding)'}};
let _lastNominatimRequest = 0;

module.exports = {
  getAssistitoFromCf: async function (cf, fallback = true, geoloc = true, forceNewToken = false) {
    const {ImpostazioniServiziTerzi} = await import('aziendasanitaria-utils/src/config/ImpostazioniServiziTerzi.js');
    const {Nar2} = await import('aziendasanitaria-utils/src/narTsServices/Nar2.js');
    let impostazioniServizi = new ImpostazioniServiziTerzi(configData);
    let nar2 = new Nar2(impostazioniServizi, {...keys});
    if (forceNewToken) {
      await nar2.getToken({newToken: true});
    }
    let data = await nar2.getDatiAssistitoCompleti(cf, {fallback: fallback});
    if (data.ok) {
      let datiAssistito = data.dati({dateToUnix: true});
      if (geoloc) {
        let geo = await this.getGeoAssistito(datiAssistito);
        if (geo) {
          datiAssistito.lat = geo.lat;
          datiAssistito.long = geo.lon;
          datiAssistito.geolocPrecise = geo.precise;
        }
      }
      return datiAssistito;
    } else {
      return null;
    }
  },
  /**
   * Riconosce un codice STP/ENI nel formato: STP1902050000001 o ENI1902050000001
   * @param {string} codice
   * @returns {{prefisso: string, codiceRegione: string, codiceAsl: string, suffisso: string}|null}
   */
  parseCodiceStp: function (codice) {
    if (!codice) return null;
    const match = codice.toUpperCase().match(/^(STP|ENI)(\d{3})(\d{3})(\d{7})$/);
    if (!match) return null;
    return {
      prefisso: match[1],
      codiceRegione: match[2],
      codiceAsl: match[3],
      suffisso: match[4]
    };
  },

  /**
   * Recupera i dati di un assistito STP/ENI dal Sistema TS e li mappa al formato assistiti.
   * @param {string} codiceStp - Codice STP/ENI completo (es. STP1902050000001)
   * @param {boolean} geoloc - Se true, tenta la geolocalizzazione
   * @returns {object|null} Dati assistito pronti per create/update, o null se non trovato
   */
  getAssistitoFromStp: async function (codiceStp, geoloc = true) {
    const parsed = this.parseCodiceStp(codiceStp);
    if (!parsed) return null;

    const {ImpostazioniServiziTerzi} = await import('aziendasanitaria-utils/src/config/ImpostazioniServiziTerzi.js');
    const {Ts} = await import('aziendasanitaria-utils/src/narTsServices/Ts.js');
    let impostazioniServizi = new ImpostazioniServiziTerzi(configData);
    let ts = new Ts(impostazioniServizi);

    const result = await ts.ricercaStpPerCodice({
      prefisso: parsed.prefisso,
      codiceAsl: parsed.codiceAsl,
      suffissoCodiceStp: parsed.suffisso
    });

    if (result.error || !result.data) return null;

    const stp = result.data;
    const {utils} = require('aziendasanitaria-utils/src/Utils');

    // Mappa i campi STP al formato assistiti
    // nazionalita STP va in comuneNascita (es. "GAMBIA"), come per gli assistiti stranieri esistenti
    const datiAssistito = {
      cf: stp.codice_stp_eni,
      cognome: stp.cognome || null,
      nome: stp.nome || null,
      sesso: stp.genere || null,
      dataNascita: stp.data_nascita ? utils.convertToUnixSeconds(stp.data_nascita) : null,
      comuneNascita: stp.nazionalita || null,
      indirizzoResidenza: stp.indirizzo || null,
      capResidenza: stp.cap || null,
      comuneResidenza: stp.comune || null,
      asp: stp.asl_ao || null,
      ssnTipoAssistito: stp.tipo_assistito || parsed.prefisso,
      ssnInizioAssistenza: stp.data_inizio_assistenza ? utils.convertToUnixSeconds(stp.data_inizio_assistenza) : null,
      ssnFineAssistenza: stp.data_fine_assistenza ? utils.convertToUnixSeconds(stp.data_fine_assistenza) : null,
      ssnMotivazioneFineAssistenza: stp.motivazione_fine_assistenza || null,
    };

    // Gestione medico (arriva come stringa unica, es. "ROSSI MARIO")
    if (stp.medico && stp.medico.trim()) {
      const parti = stp.medico.trim().split(/\s+/);
      if (parti.length >= 2) {
        datiAssistito.MMGCognome = parti[0];
        datiAssistito.MMGNome = parti.slice(1).join(' ');
      } else {
        datiAssistito.MMGCognome = stp.medico.trim();
      }
    }

    // Geolocalizzazione
    if (geoloc && datiAssistito.indirizzoResidenza) {
      try {
        let geo = await this.getGeoAssistito(datiAssistito);
        if (geo) {
          datiAssistito.lat = geo.lat;
          datiAssistito.long = geo.lon;
          datiAssistito.geolocPrecise = geo.precise;
        }
      } catch (geoErr) {
        sails.log.warn('Geolocalizzazione STP fallita:', geoErr.message);
      }
    }

    return datiAssistito;
  },

  getGeoAssistito: async function (datiAssistito, {bulk = false} = {}) {
    const indirizzo = datiAssistito.indirizzoResidenza;
    console.log('[GEO] getGeoAssistito chiamato', {indirizzo, bulk, capResidenza: datiAssistito.capResidenza, comuneResidenza: datiAssistito.comuneResidenza});
    if (!indirizzo || indirizzo.trim().length === 0) {
      console.log('[GEO] Indirizzo vuoto, skip');
      return null;
    }

    if (bulk) {
      return await this._geoFromPrivateNominatim(datiAssistito);
    } else {
      return await this._geoFromOfficialNominatim(datiAssistito);
    }
  },

  // Strategia per richieste singole: Nominatim ufficiale con query strutturata (più preciso)
  _geoFromOfficialNominatim: async function (datiAssistito) {
    const {street, streetNoFrazione, frazione, cap, comune} = this._parseIndirizzo(datiAssistito);
    console.log('[GEO] _parseIndirizzo result:', {street, streetNoFrazione, frazione, cap, comune});

    // 1) Query strutturata con via senza frazione
    try {
      const params = new URLSearchParams({
        street: streetNoFrazione,
        city: comune,
        country: 'IT',
        format: 'jsonv2',
      });
      if (cap) {
        params.set('postalcode', cap);
      }
      const url1 = `${NOMINATIM_OFFICIAL}?${params}`;
      console.log('[GEO] Step 1 - Strutturata (no frazione):', url1);
      await this._waitForOfficialRateLimit();
      const response = await axios.get(url1, NOMINATIM_HEADERS);
      console.log('[GEO] Step 1 - Status:', response.status, 'Risultati:', Array.isArray(response.data) ? response.data.length : 'non-array');
      if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
        console.log('[GEO] Step 1 - SUCCESSO precise:true', {lat: response.data[0].lat, lon: response.data[0].lon, display: response.data[0].display_name});
        return {lat: response.data[0].lat, lon: response.data[0].lon, precise: true};
      }
    } catch (err) {
      console.log('[GEO] Step 1 - ERRORE:', err.message);
    }

    // 2) Se c'è una frazione, prova strutturata con indirizzo completo (potrebbe essere parte del nome via)
    if (frazione) {
      try {
        const params = new URLSearchParams({
          street: street,
          city: comune,
          country: 'IT',
          format: 'jsonv2',
        });
        if (cap) {
          params.set('postalcode', cap);
        }
        const url1b = `${NOMINATIM_OFFICIAL}?${params}`;
        console.log('[GEO] Step 1b - Strutturata (con frazione):', url1b);
        await this._waitForOfficialRateLimit();
        const response = await axios.get(url1b, NOMINATIM_HEADERS);
        console.log('[GEO] Step 1b - Status:', response.status, 'Risultati:', Array.isArray(response.data) ? response.data.length : 'non-array');
        if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
          console.log('[GEO] Step 1b - SUCCESSO precise:true', {lat: response.data[0].lat, lon: response.data[0].lon, display: response.data[0].display_name});
          return {lat: response.data[0].lat, lon: response.data[0].lon, precise: true};
        }
      } catch (err) {
        console.log('[GEO] Step 1b - ERRORE:', err.message);
      }
    }

    // 3) Free-form con via senza frazione
    try {
      const q = `${streetNoFrazione}, ${cap} ${comune}`;
      const url2 = `${NOMINATIM_OFFICIAL}?${new URLSearchParams({q, format: 'jsonv2'})}`;
      console.log('[GEO] Step 2 - Free-form (no frazione):', url2);
      await this._waitForOfficialRateLimit();
      const response = await axios.get(url2, NOMINATIM_HEADERS);
      console.log('[GEO] Step 2 - Status:', response.status, 'Risultati:', Array.isArray(response.data) ? response.data.length : 'non-array');
      if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
        console.log('[GEO] Step 2 - SUCCESSO precise:true', {lat: response.data[0].lat, lon: response.data[0].lon, display: response.data[0].display_name});
        return {lat: response.data[0].lat, lon: response.data[0].lon, precise: true};
      }
    } catch (err) {
      console.log('[GEO] Step 2 - ERRORE:', err.message);
    }

    // 4) Fallback: solo CAP + comune (approssimato)
    if (cap) {
      try {
        const q = `${cap}, ${comune}`;
        const url3 = `${NOMINATIM_OFFICIAL}?${new URLSearchParams({q, format: 'jsonv2'})}`;
        console.log('[GEO] Step 3 - Fallback CAP:', url3);
        await this._waitForOfficialRateLimit();
        const response = await axios.get(url3, NOMINATIM_HEADERS);
        console.log('[GEO] Step 3 - Status:', response.status, 'Risultati:', Array.isArray(response.data) ? response.data.length : 'non-array');
        if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
          console.log('[GEO] Step 3 - SUCCESSO precise:false', {lat: response.data[0].lat, lon: response.data[0].lon});
          return {lat: response.data[0].lat, lon: response.data[0].lon, precise: false};
        }
      } catch (err) {
        console.log('[GEO] Step 3 - ERRORE:', err.message);
      }
    }

    console.log('[GEO] Nessun risultato da nessuno step');
    return null;
  },

  // Strategia per operazioni massive: Nominatim privato (no rate limit)
  _geoFromPrivateNominatim: async function (datiAssistito) {
    const {street, streetNoFrazione, frazione, cap, comune} = this._parseIndirizzo(datiAssistito);

    // 1) Free-form con via senza frazione sul server privato
    try {
      const q = `${streetNoFrazione}, ${cap} ${comune}`;
      const response = await axios.get(`${NOMINATIM_URL}?${new URLSearchParams({q, format: 'json'})}`);
      if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
        return {lat: response.data[0].lat, lon: response.data[0].lon, precise: true};
      }
    } catch (_) { /* fallback */ }

    // 1b) Se c'è frazione, prova con indirizzo completo
    if (frazione) {
      try {
        const q = `${street}, ${cap} ${comune}`;
        const response = await axios.get(`${NOMINATIM_URL}?${new URLSearchParams({q, format: 'json'})}`);
        if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
          return {lat: response.data[0].lat, lon: response.data[0].lon, precise: true};
        }
      } catch (_) { /* fallback */ }
    }

    // 2) Fallback: solo CAP + comune sul server privato
    if (cap) {
      try {
        const q = `${cap} ${comune}`;
        const response = await axios.get(`${NOMINATIM_URL}?${new URLSearchParams({q, format: 'json'})}`);
        if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
          return {lat: response.data[0].lat, lon: response.data[0].lon, precise: false};
        }
      } catch (_) { /* fallback */ }
    }

    // 3) Ultimo fallback: ufficiale con rate limit (CAP + comune)
    if (cap) {
      try {
        const q = `${cap}, ${comune}`;
        await this._waitForOfficialRateLimit();
        const response = await axios.get(`${NOMINATIM_OFFICIAL}?${new URLSearchParams({q, format: 'jsonv2'})}`, NOMINATIM_HEADERS);
        if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
          return {lat: response.data[0].lat, lon: response.data[0].lon, precise: false};
        }
      } catch (_) { /* nessun risultato */ }
    }

    return null;
  },

  // Regex per riconoscere tipi di via italiani (usata per separare la frazione)
  _STREET_TYPE_RE: /\b(VIA|V\.|VIALE|V\.LE|CORSO|C\.SO|PIAZZA|P\.ZZA|PIAZZALE|P\.LE|PIAZZETTA|LARGO|L\.GO|VICOLO|V\.LO|VICO|SALITA|DISCESA|TRAVERSA|TRAV\.|CONTRADA|C\.DA|STRADA|STR\.|RONCO|RIONE|BORGATA|LOCALITA|LOC\.|CALATA|RAMPA|GALLERIA|LUNGOMARE|CIRCONVALLAZIONE|VILLAGGIO|BIVIO|SS|S\.S\.|S\.P\.|SP)\b/i,

  // Parsa indirizzoResidenza dal formato TS: "PACE SALITA BISIGNANI 3, 98167 MESSINA (ME)"
  // Restituisce { street, streetNoFrazione, frazione, cap, comune } con valori puliti
  _parseIndirizzo: function (datiAssistito) {
    const raw = (datiAssistito.indirizzoResidenza || '').trim();
    let street = raw;
    let cap = datiAssistito.capResidenza;
    const comune = (datiAssistito.comuneResidenza || '').replace(/\s*\([A-Z]{2}\)\s*$/, '').trim();

    // Se contiene una virgola seguita da un CAP (5 cifre), splitta
    const matchCap = raw.match(/^(.+?),\s*(\d{5})\s+.*/);
    if (matchCap) {
      street = matchCap[1].trim();
      cap = matchCap[2]; // CAP reale dall'indirizzo (es. 98167 invece di 98100 generico)
    }

    // Rimuovi eventuale suffisso "(ME)" o "(XX)" dalla street
    street = street.replace(/\s*\([A-Z]{2}\)\s*$/, '').trim();

    // Separa eventuale frazione dal nome via
    // Es: "PACE SALITA BISIGNANI 3" -> frazione="PACE", streetNoFrazione="SALITA BISIGNANI 3"
    let frazione = null;
    let streetNoFrazione = street;

    // Cerca la posizione del primo tipo via riconosciuto nella stringa
    const matchStreetType = street.match(this._STREET_TYPE_RE);
    if (matchStreetType && matchStreetType.index > 0) {
      // Tutto prima del tipo via è la frazione
      frazione = street.substring(0, matchStreetType.index).trim();
      streetNoFrazione = street.substring(matchStreetType.index).trim();
    }

    return {street, streetNoFrazione, frazione, cap, comune};
  },

  _waitForOfficialRateLimit: async function () {
    const now = Date.now();
    const timeToWait = Math.max(0, _lastNominatimRequest + 1100 - now);
    if (timeToWait > 0) {
      await new Promise(resolve => setTimeout(resolve, timeToWait));
    }
    _lastNominatimRequest = Date.now();
  }
};
