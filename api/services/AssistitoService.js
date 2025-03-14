const axios = require('axios');
const configData = require('../../config/custom/private_nar_ts_config.json');
const keys = require('../../config/custom/private_encrypt_key.json');
const NOMINATIM_URL = 'https://nominatim.app.robertodedomenico.it/search.php';
const NOMINATIM_OFFICIAL = "https://nominatim.openstreetmap.org/search.php"

module.exports = {
  getAssistitoFromCf: async function (cf, fallback = true, geoloc = true) {
    const {ImpostazioniServiziTerzi} = await import('aziendasanitaria-utils/src/config/ImpostazioniServiziTerzi.js');
    const {Nar2} = await import('aziendasanitaria-utils/src/narTsServices/Nar2.js');
    let impostazioniServizi = new ImpostazioniServiziTerzi(configData);
    let nar2 = new Nar2(impostazioniServizi, {...keys});
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
  getGeoAssistito: async function (datiAssistito) {
    // axios get q=${indirizzo} format=json
    let indirizzo = datiAssistito.indirizzoResidenza;
    if (indirizzo && indirizzo.trim().length > 0) {
        indirizzo = `${datiAssistito.indirizzoResidenza}, ${datiAssistito.capResidenza} ${datiAssistito.comuneResidenza}`;
      const params = new URLSearchParams({
        q: indirizzo,
        format: 'json',
      });
      const response = await axios.get(`${NOMINATIM_URL}?${params}`);
      if (response.status === 200 && response.data.length > 0) {
        const data = response.data;
        if (data.length > 0) {
          return {
            lat: data[0].lat,
            lon: data[0].lon,
            precise: true
          };
        } else {
          return null; // Nessun risultato trovato
        }
      } else if (response.data.length === 0) {
        // fallback
        try {
          const cap = indirizzo.split(',')[1].trim();
          const cap2 = datiAssistito.capResidenza;
          if (cap2 !== "98100" || !cap.includes("98100")) {
            if (cap && cap.trim().length > 0) {
              const params1 = new URLSearchParams({
                q: !cap.includes("98100") ? cap : cap2,
              });
              const response1 = await axios.get(`${NOMINATIM_URL}?${params1}`);
              if (response1.status === 200 && response1.data.length > 0) {
                const data = response1.data;
                if (data.length > 0) {
                  return {
                    lat: data[0].lat,
                    lon: data[0].lon,
                    precise: false
                  };
                }
              }
              else { // ultimo tentativo con api ufficiali
                const params2 = new URLSearchParams({
                  q: (!cap.includes("98100") ? cap : cap2) + `, ${datiAssistito.comuneResidenza}`,
                });
                // wait 1 sec
                await new Promise(resolve => setTimeout(resolve, 1000));
                const response2 = await axios.get(`${NOMINATIM_OFFICIAL}?${params2}&format=jsonv2`);
                if (response2.status === 200 && response2.data.length > 0) {
                  const data = response2.data;
                  if (data.length > 0) {
                    return {
                      lat: data[0].lat,
                      lon: data[0].lon,
                      precise: false
                    };
                  }
                }
              }
            }
          }
        } catch (error) {
        }
      }
    }
    return null; // Nessun risultato trovato
  }
}
