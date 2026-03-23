/**
 * Anagrafica_ExtraDataValori.js
 *
 * @description :: Valori dei dati extra per assistito, legati a una categoria e chiave.
 *                 Vincolo unique composito: (assistito, categoria, chiave) definito in SQL.
 */

module.exports = {
  datastore: 'anagrafica',
  tableName: 'extra_data_valori',
  attributes: {

    assistito: {
      model: 'Anagrafica_Assistiti',
      required: true,
      description: 'FK verso assistiti'
    },

    categoria: {
      model: 'Anagrafica_ExtraDataCategorie',
      required: true,
      description: 'FK verso extra_data_categorie'
    },

    chiave: {
      type: 'string',
      required: true,
      maxLength: 100,
      description: 'Nome del campo (es. cellulare, email)'
    },

    valore: {
      type: 'string',
      allowNull: true,
      columnType: 'text',
      description: 'Valore corrente del campo'
    },

  },

};
