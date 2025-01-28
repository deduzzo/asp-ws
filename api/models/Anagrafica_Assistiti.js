/**
 * Anagrafica_Assistiti.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */


module.exports = {
  datastore: 'anagrafica',
  tableName: 'assistiti',
  attributes: {

    //  ╔═╗╦═╗╦╔╦╗╦╔╦╗╦╦  ╦╔═╗╔═╗
    //  ╠═╝╠╦╝║║║║║ ║ ║╚╗╔╝║╣ ╚═╗
    //  ╩  ╩╚═╩╩ ╩╩ ╩ ╩ ╚╝ ╚═╝╚═╝

    cf: {
      type: 'string',
      required: true,
      unique: true,
      description: 'Codice fiscale'
    },

    cfNormalizzato: {
      type: 'string',
      unique: true,
      allowNull: true
    },

    cognome: {
      type: 'string',
      allowNull: true
    },

    nome: {
      type: 'string',
      allowNull: true
    },

    sesso: {
      type: 'string',
      allowNull: true,
      description: 'Es. M / F (oppure altri valori, a seconda di come li gestisci)'
    },

    dataNascita: {
      type: 'number',
      allowNull: true,
      description: 'Timestamp Unix della data di nascita'
    },

    comuneNascita: {
      type: 'string',
      allowNull: true
    },

    codComuneNascita: {
      type: 'string',
      allowNull: true
    },

    codIstatComuneNascita: {
      type: 'string',
      allowNull: true
    },

    provinciaNascita: {
      type: 'string',
      allowNull: true
    },

    indirizzoResidenza: {
      type: 'string',
      allowNull: true
    },

    capResidenza: {
      type: 'string',
      allowNull: true
    },

    comuneResidenza: {
      type: 'string',
      allowNull: true
    },

    codComuneResidenza: {
      type: 'string',
      allowNull: true
    },

    codIstatComuneResidenza: {
      type: 'string',
      allowNull: true
    },

    asp: {
      type: 'string',
      allowNull: true
    },

    ssnTipoAssistito: {
      type: 'string',
      allowNull: true
    },

    ssnInizioAssistenza: {
      type: 'number',
      allowNull: true,
      description: 'Timestamp Unix della data di inizio assistenza'
    },

    ssnFineAssistenza: {
      type: 'number',
      allowNull: true,
      description: 'Timestamp Unix della data di fine assistenza'
    },

    ssnMotivazioneFineAssistenza: {
      type: 'string',
      allowNull: true
    },

    ssnNumeroTessera: {
      type: 'string',
      allowNull: true
    },

    MMGUltimaOperazione: {
      type: 'string',
      allowNull: true
    },

    MMGUltimoStato: {
      type: 'string',
      allowNull: true
    },

    MMGTipo: {
      type: 'string',
      allowNull: true
    },

    MMGCodReg: {
      type: 'string',
      allowNull: true
    },

    MMGNome: {
      type: 'string',
      allowNull: true
    },

    MMGCognome: {
      type: 'string',
      allowNull: true
    },

    MMGCf: {
      type: 'string',
      allowNull: true
    },

    MMGDataScelta: {
      type: 'number',
      allowNull: true,
      description: 'Timestamp Unix della data di scelta del MMG'
    },

    MMGDataRevoca: {
      type: 'number',
      allowNull: true,
      description: 'Timestamp Unix della data di revoca del MMG'
    },

    dataDecesso: {
      type: 'number',
      allowNull: true,
      description: 'Timestamp Unix della data del decesso'
    },

    md5: {
      type: 'string',
      allowNull: false,
      description: 'MD5 dei valori per verifica eventuali aggiornamenti'
    },

    //  ╔═╗╔╦╗╔╗ ╔═╗╔╦╗╔═╗
    //  ║╣ ║║║╠╩╗║╣  ║║╚═╗
    //  ╚═╝╩ ╩╚═╝╚═╝═╩╝╚═╝


    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

  },

};

