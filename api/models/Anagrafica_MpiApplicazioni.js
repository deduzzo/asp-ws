module.exports = {
  datastore: 'anagrafica',
  tableName: 'mpi_applicazioni',
  attributes: {
    codice:      {type: 'string', required: true, unique: true, maxLength: 50},
    nome:        {type: 'string', required: true, maxLength: 255},
    descrizione: {type: 'string', allowNull: true, columnType: 'text'},
    versione:    {type: 'string', allowNull: true, maxLength: 20},
    contatto:    {type: 'string', allowNull: true, maxLength: 255},
    attivo:      {type: 'boolean', defaultsTo: true},
  }
};
