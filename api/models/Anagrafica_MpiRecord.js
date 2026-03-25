const {utils} = require('aziendasanitaria-utils/src/Utils');
const crypto = require('crypto');

module.exports = {
  datastore: 'anagrafica',
  tableName: 'mpi_record',
  attributes: {
    mpiId:        {type: 'string', required: true, unique: true, maxLength: 36},
    applicazione: {model: 'Anagrafica_MpiApplicazioni', required: true},
    idEsterno:    {type: 'string', allowNull: true, maxLength: 255},
    stato:        {type: 'string', isIn: ['aperto', 'identificato', 'annullato'], defaultsTo: 'aperto'},
    assistito:    {model: 'Anagrafica_Assistiti'},

    dataIdentificazione:    {type: 'number', allowNull: true},
    utenteIdentificazione:  {type: 'string', allowNull: true, maxLength: 100},

    // Campi demografici (stessi nomi di Anagrafica_Assistiti)
    cf:                         {type: 'string', allowNull: true, maxLength: 20},
    cognome:                    {type: 'string', allowNull: true, maxLength: 255},
    nome:                       {type: 'string', allowNull: true, maxLength: 255},
    sesso:                      {type: 'string', allowNull: true, maxLength: 5},
    dataNascita:                {type: 'number', allowNull: true},
    comuneNascita:              {type: 'string', allowNull: true, maxLength: 255},
    codComuneNascita:           {type: 'string', allowNull: true, maxLength: 20},
    codIstatComuneNascita:      {type: 'string', allowNull: true, maxLength: 20},
    provinciaNascita:           {type: 'string', allowNull: true, maxLength: 5},
    indirizzoResidenza:         {type: 'string', allowNull: true, maxLength: 255},
    capResidenza:               {type: 'string', allowNull: true, maxLength: 10},
    comuneResidenza:            {type: 'string', allowNull: true, maxLength: 255},
    codComuneResidenza:         {type: 'string', allowNull: true, maxLength: 20},
    codIstatComuneResidenza:    {type: 'string', allowNull: true, maxLength: 20},
    asp:                        {type: 'string', allowNull: true, maxLength: 10},
    ssnTipoAssistito:           {type: 'string', allowNull: true, maxLength: 50},
    ssnInizioAssistenza:        {type: 'number', allowNull: true},
    ssnFineAssistenza:          {type: 'number', allowNull: true},
    ssnMotivazioneFineAssistenza: {type: 'string', allowNull: true, maxLength: 255},
    ssnNumeroTessera:           {type: 'string', allowNull: true, maxLength: 50},
    dataDecesso:                {type: 'number', allowNull: true},

    note: {type: 'string', allowNull: true, columnType: 'text'},
  },

  beforeCreate: async function (record, proceed) {
    if (!record.mpiId) {
      record.mpiId = crypto.randomUUID();
    }
    return proceed();
  },

  customToJSON: function () {
    const obj = this;
    if (obj.dataNascita) {
      obj.dataNascita = utils.convertUnixTimestamp(obj.dataNascita);
    }
    if (obj.dataDecesso) {
      obj.dataDecesso = utils.convertUnixTimestamp(obj.dataDecesso);
    }
    if (obj.ssnInizioAssistenza) {
      obj.ssnInizioAssistenza = utils.convertUnixTimestamp(obj.ssnInizioAssistenza);
    }
    if (obj.ssnFineAssistenza) {
      obj.ssnFineAssistenza = utils.convertUnixTimestamp(obj.ssnFineAssistenza);
    }
    if (obj.dataIdentificazione) {
      obj.dataIdentificazione = utils.convertUnixTimestamp(obj.dataIdentificazione);
    }
    obj.createdAt = utils.convertUnixTimestamp(obj.createdAt, 'Europe/Rome', 'DD/MM/YYYY HH:mm:ss');
    obj.updatedAt = utils.convertUnixTimestamp(obj.updatedAt, 'Europe/Rome', 'DD/MM/YYYY HH:mm:ss');
    return _.omit(this, ['id']);
  }
};
