const fs = require('fs');
const turf = require('@turf/turf');
const path = require('path');

const quartieriMap = {
  'I CIRCOSCRIZIONE': '1',
  'II CIRCOSCRIZIONE': '2',
  'III CIRCOSCRIZIONE': '3',
  'IV CIRCOSCRIZIONE': '4',
  'V CIRCOSCRIZIONE': '5',
  'VI CIRCOSCRIZIONE': '6',
}

class VerificaQuartieri {
  /**
   * Costruttore che accetta il percorso del file GeoJSON dei quartieri
   * @param {string} nomeFileGeoJSON - Percorso al file GeoJSON contenente i quartieri
   */
  constructor(nomeFileGeoJSON) {
    try {
      const contenutoFile = fs.readFileSync(path.resolve(sails.config.appPath, "api","data", nomeFileGeoJSON), 'utf8');
      this.datiQuartieri = JSON.parse(contenutoFile);

      if (!this.datiQuartieri.features || !Array.isArray(this.datiQuartieri.features)) {
        throw new Error('Formato GeoJSON non valido: manca l\'array features');
      }
    } catch (errore) {
      throw new Error(`Impossibile caricare il file dei quartieri: ${errore.message}`);
    }
  }

  /**
   * Verifica in quale quartiere si trova un punto
   * @param {number} latitudine - Latitudine del punto
   * @param {number} longitudine - Longitudine del punto
   * @returns {string|null} Nome del quartiere o null se fuori da tutti i quartieri
   */
  verificaPuntoMappa(latitudine, longitudine) {
    // Crea un punto GeoJSON (GeoJSON usa [longitudine, latitudine])
    const punto = turf.point([longitudine, latitudine]);

    for (const feature of this.datiQuartieri.features) {
      try {
        if (turf.booleanPointInPolygon(punto, feature.geometry)) {
          // Restituisce il nome del quartiere trovato in una delle possibili proprietà
          return quartieriMap[feature.properties.LAYER];
        }
      } catch (errore) {
        console.error(`Errore durante l'analisi di un quartiere: ${errore.message}`);
      }
    }

    // Punto non trovato in nessun quartiere
    return null;
  }
}

module.exports = VerificaQuartieri;
