/**
 * Seed Function
 * (sails.config.bootstrap)
 *
 * A function that runs just before your Sails app gets lifted.
 * > Need more flexibility?  You can also create a hook.
 *
 * For more information on seeding your app with fake data, check out:
 * https://sailsjs.com/config/bootstrap
 */

const {generateToken, verifyToken} = require('../api/services/JwtService');
const {utils} = require('aziendasanitaria-utils/src/Utils');
const {Assistito} = require('aziendasanitaria-utils/src/classi/Assistito');
const meilisearchService = require('../api/services/MeilisearchService');
const fs = require('fs');
const path = require('path');


module.exports.bootstrap = async function () {

  // By convention, this is a good place to set up fake data during development.
  //
  // For example:
  // ```
  // // Set up fake development data (or if we already have some, avast)
  // if (await User.count() > 0) {
  //   return;
  // }
  //
  // await User.createEach([
  //   { emailAddress: 'ry@example.com', fullName: 'Ryan Dahl', },
  //   { emailAddress: 'rachael@example.com', fullName: 'Rachael Shaw', },
  //   // etc.
  // ]);
  // ```

  const drop = false;
  if (drop) {
    await Auth_Livelli.destroy({});
    await Auth_Livelli.createEach([
      {livello: 'admin'},
      {livello: 'guest'},
      {livello: 'user'},
      {livello: 'admin'},
      {livello: 'superAdmin', isSuperAdmin: true},]
    );
    await Auth_Ambiti.createEach([
      {ambito: 'globale', is_dominio: 0},
      {ambito: 'asp.messina.it', is_dominio: 1},
      {ambito: 'api', is_dominio: 0},]);
    const scopoAnagrafica = await Auth_Scopi.create({scopo: 'asp5-anagrafica', attivo: true}).fetch();
    const ambitoApi = await Auth_Ambiti.findOne({ambito: 'api'});
    const livelloSuperAdmin = await Auth_Livelli.findOne({livello: 'superAdmin'});
    const superAdmin = await Auth_Utenti.create({
      username: 'roberto.dedomenico',
      password: await sails.helpers.passwords.hashPassword(''),
      attivo: true,
      ambito: ambitoApi.id,
      livello: livelloSuperAdmin.id,
    }).fetch();
    // scopi of SuperAdmin scopoAnagrafica
    await Auth_Utenti.addToCollection(superAdmin.id, 'scopi', scopoAnagrafica.id);
    // foreign key
    const authDataStore = sails.getDatastore('auth');
    const anagraficaDataStore = sails.getDatastore('anagrafica');
    let utentiAmbito = await authDataStore.sendNativeQuery(`
      alter table utenti
        add constraint utenti_ambiti_id_fk
          foreign key (ambito) references ambiti (id);`);
    let utentiLivello = await authDataStore.sendNativeQuery(`
      alter table utenti
        add constraint utenti_livelli_id_fk
          foreign key (livello) references livelli (id);`);

    let utentiScopi = await authDataStore.sendNativeQuery(`
      alter table utenti_scopi
        add constraint utenti_scopi_utenti_id_fk
          foreign key (utente) references utenti (id);`);
    let utentiScopiScopi = await authDataStore.sendNativeQuery(`
      alter table utenti_scopi
        add constraint utenti_scopi_scopi_id_fk
          foreign key (scopo) references scopi (id);`);
  }

  // ADD NEW USER
/*
const password= "";
  const newUser = await Auth_Utenti.create({
    username: 'icaro.maggioli',
    password: await sails.helpers.passwords.hashPassword(password),
    attivo: true,
    ambito: (await Auth_Ambiti.findOne({ambito: 'api'})).id,
    livello: (await Auth_Livelli.findOne({livello: 'user'})).id,
  }).fetch();
  // scopi of SuperAdmin scopoAnagrafica
  await Auth_Utenti.addToCollection(newUser.id, 'scopi', (await Auth_Scopi.findOne({scopo: 'asp5-anagrafica'})).id);
*/

  const pass = await sails.helpers.passwords.hashPassword("a[5!TEC9oYQo");
  console.log("ciao")


  /*  await anagraficaDataStore.sendNativeQuery(`ALTER TABLE assistiti
      ADD COLUMN fulltext_search VARCHAR(255)
          AS (
              CONCAT_WS(' ',
                  nome,
                  IFNULL(cognome, ''),
                  cf,
                  DATE_FORMAT(FROM_UNIXTIME(dataNascita), '%d/%m/%Y')
              )
          ) STORED;`);
    await anagraficaDataStore.sendNativeQuery(`
  ALTER TABLE assistiti
      ADD FULLTEXT (fulltext_search);`);
      await anagraficaDataStore.sendNativeQuery(`
  create unique index assistiti_cf_uindex
    on assistiti (cf);`);*/



/*  //await meilisearchService.deleteIndex(meilisearchService.ASSISTITI_INDEX);
  let res = await meilisearchService.search('ZTIMML30');
  //await Procedure.creaFileJsonAssistitiCompletoDaFilesZip("/Users/deduzzo/Library/CloudStorage/GoogleDrive-info@robertodedomenico.it/Drive condivisi/LAVORO ASP/DB_ASSISTITI/20250127")

  let data = await utils.leggiOggettoMP("/Users/deduzzo/Library/CloudStorage/GoogleDrive-info@robertodedomenico.it/Drive condivisi/LAVORO ASP/DB_ASSISTITI/20250127/assistiti.db");
  const tot = Object.values(data).length;
  let i = 0;
  let values = Object.values(data);*/
  // remove the first 7170 elements from values
  //values = values.splice(0, 4170);

/*  for (let assistito of values) {
    let tempAssistito = new Assistito();
    console.log("Verificando assistito " + assistito.cf);
    const created2 = await Anagrafica_Assistiti.createOrUpdate(tempAssistito.dati({fromAssistitoObject: assistito,dateToUnix:true}));
    //const created = await Anagrafica_Assistiti.create( tempAssistito.dati({fromAssistitoObject: assistito,dateToUnix:true})).fetch();
    console.log((++i / tot * 100).toFixed(4) + "% " + i + "/" + tot + " " + assistito.cf + " " + created2.message);
  }*/

  // invert values
/*
  const BATCH_SIZE = 50;
  const DELAY_BETWEEN_BATCHES = 50;
  const processInBatches = async (values) => {
    const tot = values.length;
    let i = 77800;

    // Dividiamo l'array in batch
    for (let index = i; index < values.length; index += BATCH_SIZE) {
      const batch = values.slice(index, index + BATCH_SIZE);

      // Creiamo un array di promises per il batch corrente
      const promises = batch.map(async assistito => {
        let tempAssistito = new Assistito();
        //console.log("Verificando assistito " + assistito.cf);

        try {
          const created2 = await Anagrafica_Assistiti.createOrUpdate(
            tempAssistito.dati({fromAssistitoObject: assistito, dateToUnix: true})
          );

          i++;
          console.log(
            `${(i / tot * 100).toFixed(4)}% ${i}/${tot} ${assistito.cf} ${created2.message}`
          );

          return created2;
        } catch (error) {
          console.error(`Errore per assistito ${assistito.cf}:`, error);
          throw error;
        }
      });

      // Eseguiamo tutte le promises del batch in parallelo
      await Promise.all(promises);
      // Aggiungiamo un delay tra i batch
      if (index + BATCH_SIZE < values.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
  }

  // Utilizzo
  try {
    await processInBatches(values);
    console.log('Elaborazione completata');
  } catch (error) {
    console.error('Errore durante l\'elaborazione:', error);
  }

*/

};
