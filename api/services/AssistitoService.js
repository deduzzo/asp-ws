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
    const {indirizzoResidenza, capResidenza, comuneResidenza} = datiAssistito;

    // 1) Query strutturata con indirizzo completo
    try {
      const params = new URLSearchParams({
        street: indirizzoResidenza,
        city: comuneResidenza,
        country: 'IT',
        format: 'jsonv2',
      });
      if (capResidenza) {
        params.set('postalcode', capResidenza);
      }
      await this._waitForOfficialRateLimit();
      const response = await axios.get(`${NOMINATIM_OFFICIAL}?${params}`);
      if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
        return {lat: response.data[0].lat, lon: response.data[0].lon, precise: true};
      }
    } catch (_) { /* fallback */ }

    // 2) Free-form con indirizzo completo
    try {
      const q = `${indirizzoResidenza}, ${capResidenza} ${comuneResidenza}`;
      await this._waitForOfficialRateLimit();
      const response = await axios.get(`${NOMINATIM_OFFICIAL}?${new URLSearchParams({q, format: 'jsonv2'})}`);
      if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
        return {lat: response.data[0].lat, lon: response.data[0].lon, precise: true};
      }
    } catch (_) { /* fallback */ }

    // 3) Fallback: solo CAP + comune (approssimato)
    if (capResidenza && capResidenza !== '98100') {
      try {
        const q = `${capResidenza}, ${comuneResidenza}`;
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
    const {indirizzoResidenza, capResidenza, comuneResidenza} = datiAssistito;

    // 1) Free-form con indirizzo completo sul server privato
    try {
      const q = `${indirizzoResidenza}, ${capResidenza} ${comuneResidenza}`;
      const response = await axios.get(`${NOMINATIM_URL}?${new URLSearchParams({q, format: 'json'})}`);
      if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
        return {lat: response.data[0].lat, lon: response.data[0].lon, precise: true};
      }
    } catch (_) { /* fallback */ }

    // 2) Fallback: solo CAP + comune sul server privato
    if (capResidenza && capResidenza !== '98100') {
      try {
        const q = `${capResidenza} ${comuneResidenza}`;
        const response = await axios.get(`${NOMINATIM_URL}?${new URLSearchParams({q, format: 'json'})}`);
        if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
          return {lat: response.data[0].lat, lon: response.data[0].lon, precise: false};
        }
      } catch (_) { /* fallback */ }
    }

    // 3) Ultimo fallback: ufficiale con rate limit (CAP + comune)
    if (capResidenza && capResidenza !== '98100') {
      try {
        const q = `${capResidenza}, ${comuneResidenza}`;
        await this._waitForOfficialRateLimit();
        const response = await axios.get(`${NOMINATIM_OFFICIAL}?${new URLSearchParams({q, format: 'jsonv2'})}`);
        if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
          return {lat: response.data[0].lat, lon: response.data[0].lon, precise: false};
        }
      } catch (_) { /* nessun risultato */ }
    }

    return null;
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
