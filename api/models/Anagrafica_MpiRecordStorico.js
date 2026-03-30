const {utils} = require('aziendasanitaria-utils/src/Utils');

module.exports = {
  datastore: 'anagrafica',
  tableName: 'mpi_record_storico',
  attributes: {
    mpiRecord:  {model: 'Anagrafica_MpiRecord', required: true},
    operazione: {type: 'string', required: true, isIn: ['CREATE', 'UPDATE', 'LINK', 'UNLINK', 'ANNULLA']},
    dettaglio:  {type: 'json'},
    utente:     {type: 'string', required: true, maxLength: 100},
    ipAddress:  {type: 'string', allowNull: true, maxLength: 45},
  },
  customToJSON: function () {
    const obj = this;
    obj.createdAt = utils.convertUnixTimestamp(obj.createdAt, 'Europe/Rome', 'DD/MM/YYYY HH:mm:ss');
    return obj;
  }
};
