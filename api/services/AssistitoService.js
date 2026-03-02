const axios = require('axios');
const configData = require('../../config/custom/private_nar_ts_config.json');
const keys = require('../../config/custom/private_encrypt_key.json');
const NOMINATIM_URL = 'https://nominatim.app.robertodedomenico.it/search.php';
const NOMINATIM_OFFICIAL = 'https://nominatim.openstreetmap.org/search.php';
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
  getGeoAssistito: async function (datiAssistito, {bulk = false} = {}) {
    const indirizzo = datiAssistito.indirizzoResidenza;
    if (!indirizzo || indirizzo.trim().length === 0) {
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
    const {street, cap, comune} = this._parseIndirizzo(datiAssistito);

    // 1) Query strutturata con indirizzo parsato
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
      await this._waitForOfficialRateLimit();
      const response = await axios.get(`${NOMINATIM_OFFICIAL}?${params}`);
      if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
        return {lat: response.data[0].lat, lon: response.data[0].lon, precise: true};
      }
    } catch (_) { /* fallback */ }

    // 2) Free-form con indirizzo parsato
    try {
      const q = `${street}, ${cap} ${comune}`;
      await this._waitForOfficialRateLimit();
      const response = await axios.get(`${NOMINATIM_OFFICIAL}?${new URLSearchParams({q, format: 'jsonv2'})}`);
      if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
        return {lat: response.data[0].lat, lon: response.data[0].lon, precise: true};
      }
    } catch (_) { /* fallback */ }

    // 3) Fallback: solo CAP + comune (approssimato)
    if (cap) {
      try {
        const q = `${cap}, ${comune}`;
        await this._waitForOfficialRateLimit();
        const response = await axios.get(`${NOMINATIM_OFFICIAL}?${new URLSearchParams({q, format: 'jsonv2'})}`);
        if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
          return {lat: response.data[0].lat, lon: response.data[0].lon, precise: false};
        }
      } catch (_) { /* nessun risultato */ }
    }

    return null;
  },

  // Strategia per operazioni massive: Nominatim privato (no rate limit)
  _geoFromPrivateNominatim: async function (datiAssistito) {
    const {street, cap, comune} = this._parseIndirizzo(datiAssistito);

    // 1) Free-form con indirizzo parsato sul server privato
    try {
      const q = `${street}, ${cap} ${comune}`;
      const response = await axios.get(`${NOMINATIM_URL}?${new URLSearchParams({q, format: 'json'})}`);
      if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
        return {lat: response.data[0].lat, lon: response.data[0].lon, precise: true};
      }
    } catch (_) { /* fallback */ }

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
        const response = await axios.get(`${NOMINATIM_OFFICIAL}?${new URLSearchParams({q, format: 'jsonv2'})}`);
        if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
          return {lat: response.data[0].lat, lon: response.data[0].lon, precise: false};
        }
      } catch (_) { /* nessun risultato */ }
    }

    return null;
  },

  // Parsa indirizzoResidenza dal formato TS: "PACE SALITA BISIGNANI 3, 98167 MESSINA (ME)"
  // Restituisce { street, cap, comune } con valori puliti
  _parseIndirizzo: function (datiAssistito) {
    const raw = (datiAssistito.indirizzoResidenza || '').trim();
    let street = raw;
    let cap = datiAssistito.capResidenza;
    const comune = (datiAssistito.comuneResidenza || '').replace(/\s*\([A-Z]{2}\)\s*$/, '').trim();

    // Se contiene una virgola seguita da un CAP (5 cifre), splitta
    const match = raw.match(/^(.+?),\s*(\d{5})\s+.*/);
    if (match) {
      street = match[1].trim();
      cap = match[2]; // CAP reale dall'indirizzo (es. 98167 invece di 98100 generico)
    }

    // Rimuovi eventuale suffisso "(ME)" o "(XX)" dalla street
    street = street.replace(/\s*\([A-Z]{2}\)\s*$/, '').trim();

    return {street, cap, comune};
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
