/**
 * Anagrafica_ExtraDataCategorie.js
 *
 * @description :: Categorie di dati extra per gli assistiti (es. CONTATTI, DOCUMENTI)
 */

module.exports = {
  datastore: 'anagrafica',
  tableName: 'extra_data_categorie',
  attributes: {

    codice: {
      type: 'string',
      required: true,
      unique: true,
      maxLength: 50,
      description: 'Codice univoco della categoria (es. CONTATTI)'
    },

    descrizione: {
      type: 'string',
      allowNull: true,
      maxLength: 255,
      description: 'Nome leggibile della categoria'
    },

    scopoLettura: {
      type: 'string',
      required: true,
      maxLength: 100,
      description: 'Scope richiesto per leggere i dati di questa categoria'
    },

    scopoScrittura: {
      type: 'string',
      required: true,
      maxLength: 100,
      description: 'Scope richiesto per scrivere i dati di questa categoria'
    },

    campi: {
      type: 'json',
      required: true,
      description: 'Definizione dei campi: [{chiave, tipo, obbligatorio, etichetta}]'
    },

    attivo: {
      type: 'boolean',
      defaultsTo: true,
      description: 'Se la categoria è attiva'
    },

  },

};
