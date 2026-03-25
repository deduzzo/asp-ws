const {utils} = require('aziendasanitaria-utils/src/Utils');

module.exports = {
  datastore: 'anagrafica',
  tableName: 'mpi_extra_data_storico',
  attributes: {
    valore:        {model: 'Anagrafica_MpiExtraDataValori', required: true},
    vecchioValore: {type: 'string', allowNull: true, columnType: 'text'},
    nuovoValore:   {type: 'string', allowNull: true, columnType: 'text'},
    operazione:    {type: 'string', required: true, isIn: ['CREATE', 'UPDATE', 'DELETE']},
    utente:        {type: 'string', required: true, maxLength: 100},
    ipAddress:     {type: 'string', allowNull: true, maxLength: 45},
  },
  customToJSON: function () {
    const obj = this;
    obj.createdAt = utils.convertUnixTimestamp(obj.createdAt, 'Europe/Rome', 'DD/MM/YYYY HH:mm:ss');
    return obj;
  }
};
