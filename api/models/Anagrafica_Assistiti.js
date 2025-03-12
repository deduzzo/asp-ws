/**
 * Anagrafica_Assistiti.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */
const meilisearchService = require('../services/MeilisearchService');
const {utils} = require('aziendasanitaria-utils/src/Utils');
const toRemove = ['createdAt', 'updatedAt', 'md5', 'eta', 'id', 'inVita', 'lastCheck','lat','long','geolocPrecise'];


const getMd5FromDataAssistito = (assistito) => {
  const objRemoved = _.omit(assistito, toRemove);
  return utils.calcolaMD5daStringa(JSON.stringify(objRemoved));
};

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

    lat: {
      type: 'number',
      allowNull: true,
      description: 'Latitudine della posizione geografica'
    },

    long: {
      type: 'number',
      allowNull: true,
      description: 'Longitudine della posizione geografica'
    },

    geolocPrecise: {
      type: 'boolean',
      allowNull: true,
      description: 'Tipo di geolocalizzazione'
    },

    md5: {
      type: 'string',
      allowNull: false,
      description: 'MD5 dei valori per verifica eventuali aggiornamenti'
    },

    lastCheck: {
      type: 'number',
      allowNull: true,
      description: 'Timestamp Unix dell\'ultimo controllo'
    },

    //  ╔═╗╔╦╗╔╗ ╔═╗╔╦╗╔═╗
    //  ║╣ ║║║╠╩╗║╣  ║║╚═╗
    //  ╚═╝╩ ╩╚═╝╚═╝═╩╝╚═╝


    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

  },
  customToJSON: function () {
    // ritorna l'oggetto con i campi dataNascita e dataDecesso convertiti in stringhe usando utils.convertUnixSecondsToDate
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
    if (obj.MMGDataScelta) {
      obj.MMGDataScelta = utils.convertUnixTimestamp(obj.MMGDataScelta);
    }
    if (obj.MMGDataRevoca) {
      obj.MMGDataRevoca = utils.convertUnixTimestamp(obj.MMGDataRevoca);
    }
    if (obj.lastCheck) {
      obj.lastCheck = utils.convertUnixTimestamp(obj.lastCheck);
    }
    obj.createdAt = utils.convertUnixTimestamp(obj.createdAt, 'Europe/Rome', 'DD/MM/YYYY HH:mm:ss');
    obj.updatedAt = utils.convertUnixTimestamp(obj.updatedAt, 'Europe/Rome', 'DD/MM/YYYY HH:mm:ss');
    return _.omit(this, ['id']);
  },
  getMd5FromDataAssistito,

  beforeCreate: async function (newRecord, proceed) {
    newRecord.md5 = getMd5FromDataAssistito(newRecord);
    return proceed();
  },
  beforeUpdate: async function (updatedRecord, proceed) {
    updatedRecord.md5 = getMd5FromDataAssistito(updatedRecord);
    return proceed();
  },
  // Lifecycle Callbacks
  afterCreate: async function (newlyCreatedRecord, proceed) {
    try {
      let record = {
        id: newlyCreatedRecord.id,
        cf: newlyCreatedRecord.cf,
        nome: newlyCreatedRecord.nome,
        cognome: newlyCreatedRecord.cognome,
        dataNascita: utils.convertUnixTimestamp(newlyCreatedRecord.dataNascita),
        md5: newlyCreatedRecord.md5
      };
      record.fullText = module.exports.generateFullText(record);
      await meilisearchService.addDocument(record);
      return proceed();
    } catch (err) {
      sails.log.error('Errore nell\'indicizzazione del nuovo record:', err);
      return proceed(err);
    }
  },

  afterUpdate: async function (updatedRecord, proceed) {
    try {
      let record = {
        id: updatedRecord.id,
        cf: updatedRecord.cf,
        nome: updatedRecord.nome,
        cognome: updatedRecord.cognome,
        dataNascita: utils.convertUnixTimestamp(updatedRecord.dataNascita),
        md5: updatedRecord.md5
      };
      record.fullText = module.exports.generateFullText(record);
      await meilisearchService.updateDocument(record);
      return proceed();
    } catch (err) {
      sails.log.error('Errore nell\'aggiornamento dell\'indice:', err);
      return proceed(err);
    }
  },

  beforeDestroy: async function (criteria, proceed) {
    try {
      // Recupera l'ID del record che sta per essere eliminato
      const recordToDelete = await Anagrafica_Assistiti.findOne(criteria);
      if (recordToDelete) {
        await meilisearchService.deleteDocument(recordToDelete.cf);
      }
      return proceed();
    } catch (err) {
      sails.log.error('Errore nella rimozione del documento dall\'indice:', err);
      return proceed(err);
    }
  },
  createOrUpdate: async function (assistito) {
    let exist = await meilisearchService.findFromCf(assistito.cf);
    if (exist.length === 1) {
      const md5 = getMd5FromDataAssistito(assistito);
      if (exist[0].md5 === md5) {
        assistito.lastCheck = utils.nowToUnixDate();
        await Anagrafica_Assistiti.update({cf: assistito.cf}, assistito);
        return {cf: assistito.cf, id: exist[0].id, message: 'Assistito già presente'};
      } else {
        const updated = await Anagrafica_Assistiti.update({cf: assistito.cf}, assistito).fetch();
        return {cf: assistito.cf, id: updated.id, message: 'Assistito aggiornato'};
      }
    } else if (exist.length === 0) {
      let created = null;
      try {
        created = await Anagrafica_Assistiti.create(assistito).fetch();
      } catch (err) {
        // try to catch from db
        if (err.code === 'E_UNIQUE') {
          console.log(err);
          created = await Anagrafica_Assistiti.findOne({cf: assistito.cf});
          // create the meilisearch document
          let assistitoData = {
            id: created.id,
            cf: created.cf,
            nome: created.nome,
            cognome: created.cognome,
            dataNascita: utils.convertUnixTimestamp(created.dataNascita),
            md5: created.md5
          };
          assistitoData.fullText = module.exports.generateFullText(assistitoData);
          await meilisearchService.addDocument(assistitoData);
          return {cf: created.cf, id: created.id, message: 'Assistito non creato, ma mancava indice. Aggiunto.'};
        } else {
          throw err;
        }
      }
      return {cf: created.cf, id: created.id, message: 'Assistito creato'};
    } else {
      return {cf: assistito.cf, message: 'Assistito duplicato'};
    }
  },
  generateFullText(assistito) {
    // Aggiungiamo più varianti per nome e cognome
    const createVariants = (str) => {
      const variants = [];
      // Convertiamo tutto in maiuscolo (o minuscolo) per standardizzare
      str = str.toUpperCase(); // o toLowerCase()

      // Aggiungiamo il testo originale
      variants.push(str);
      // Aggiungiamo prefissi di varie lunghezze
      for (let i = 3; i <= str.length; i++) {
        variants.push(str.substring(0, i));
      }
      return variants;
    };

    const nameVariants = createVariants(assistito.nome);
    const surnameVariants = createVariants(assistito.cognome);

    // Varianti della data
    const dataParts = assistito.dataNascita ? assistito.dataNascita.split('/') : null;
    const dataVariants = dataParts ? [
      assistito.dataNascita,
      dataParts[2],  // 1994
    ] : [];

    return [
      ...nameVariants,
      ...surnameVariants,
      assistito.cf,
      ...dataVariants,
      `${assistito.nome} ${assistito.cognome}`,
      `${assistito.cognome} ${assistito.nome}`
    ].join(' ');
  }

};

