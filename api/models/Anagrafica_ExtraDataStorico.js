/**
 * Anagrafica_ExtraDataStorico.js
 *
 * @description :: Storico delle modifiche ai dati extra degli assistiti.
 */

module.exports = {
  datastore: 'anagrafica',
  tableName: 'extra_data_storico',
  attributes: {

    valore: {
      model: 'Anagrafica_ExtraDataValori',
      required: true,
      description: 'FK verso extra_data_valori'
    },

    vecchioValore: {
      type: 'string',
      allowNull: true,
      columnType: 'text',
      description: 'Valore precedente (null per creazione)'
    },

    nuovoValore: {
      type: 'string',
      allowNull: true,
      columnType: 'text',
      description: 'Nuovo valore (null per cancellazione)'
    },

    operazione: {
      type: 'string',
      required: true,
      isIn: ['CREATE', 'UPDATE', 'DELETE'],
      description: 'Tipo di operazione'
    },

    utente: {
      type: 'string',
      required: true,
      maxLength: 100,
      description: 'Username di chi ha effettuato la modifica'
    },

    ipAddress: {
      type: 'string',
      allowNull: true,
      maxLength: 45,
      description: 'Indirizzo IP di chi ha effettuato la modifica'
    },

  },

};
