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
/*
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
    password: await sails.helpers.passwords.hashPassword('Era@@1234.'),
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

  await anagraficaDataStore.sendNativeQuery(`ALTER TABLE assistiti
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
  on assistiti (cf);`);
*/
  const cfData = await AssistitoService.getAssistitoFromCf("DDMRRT86A03F158E");
  if (cfData.ok) {
    const data = cfData.dati();
    try {
      await Anagrafica_Assistiti.create(cfData.dati());
    }
    catch (err) {
      console.log(err)
    }
    let res = await Anagrafica_Assistiti.ricercaFulltext("domen rob");
    console.log(res)
  }


  let bearerTest = JwtService.generateToken({
    username: 'roberto.dedomenico',
    scopi: ['asp5-anagrafica'],
    ambito: 'api',
  });
  let testtoken = await JwtService.verifyToken(bearerTest,Auth_Livelli.LIVELLO_USER);
  console.log("ciao")
};
