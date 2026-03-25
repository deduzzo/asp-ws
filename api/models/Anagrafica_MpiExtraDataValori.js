module.exports = {
  datastore: 'anagrafica',
  tableName: 'mpi_extra_data_valori',
  attributes: {
    mpiRecord: {model: 'Anagrafica_MpiRecord', required: true},
    categoria: {model: 'Anagrafica_ExtraDataCategorie', required: true},
    chiave:    {type: 'string', required: true, maxLength: 100},
    valore:    {type: 'string', allowNull: true, columnType: 'text'},
  }
};
