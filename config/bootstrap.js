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
  await auth_Livelli.destroy({});
  await auth_Livelli.createEach([
    {livello: 'admin'},
    {livello: 'guest'},
    {livello: 'user'},
    {livello: 'admin'},
    {livello: 'superAdmin', isSuperAdmin: true},]
  );
  await auth_Ambiti.createEach([
    {ambito: 'globale', is_dominio: 0},
    {ambito: 'asp.messina.it', is_dominio: 1},
    {ambito: 'api', is_dominio: 0},]);
  const scopoAnagrafica = await auth_Scopi.create({scopo: 'asp5-anagrafica', attivo: true}).fetch();
  const ambitoApi = await auth_Ambiti.findOne({ambito: 'api'});
  const livelloSuperAdmin = await auth_Livelli.findOne({livello: 'superAdmin'});
  const superAdmin = await auth_Utenti.create({
    username: 'roberto.dedomenico',
    password: await sails.helpers.passwords.hashPassword('Era@@1234.'),
    attivo: true,
    ambito: ambitoApi.id,
    livello: livelloSuperAdmin.id,
  }).fetch();
  // scopi of SuperAdmin scopoAnagrafica
  await auth_Utenti.addToCollection(superAdmin.id, 'scopi', scopoAnagrafica.id);

  let bearerTest = JwtService.generateToken({
    username: 'roberto.dedomenico',
    scopi: ['asp5-anagrafica'],
    ambito: 'api',
  });
  let testtoken = await JwtService.verifyToken(bearerTest,auth_Livelli.LIVELLO_USER);
  console.log("ciao")
};
