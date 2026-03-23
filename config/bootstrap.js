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

  // Esegui migrazioni SQL pendenti
  try {
    const migrationResult = await sails.helpers.runMigrations();
    if (migrationResult.errors && migrationResult.errors.length > 0) {
      sails.log.warn('Alcune migrazioni hanno avuto errori:', migrationResult.errors);
    }
  } catch (err) {
    sails.log.error('Errore durante l\'esecuzione delle migrazioni:', err.message);
  }

  if (sails.config['swagger-generator'] && sails.config['swagger-generator'].swagger) {
    sails.config['swagger-generator'].swagger.servers = [
      {
        url: sails.config.custom.baseUrl
      }
    ];
  }

  // Sync app states with actual Docker containers
  try {
    await AppsService.syncContainerStates();
  } catch (err) {
    sails.log.warn('Error syncing app container states:', err.message);
  }
};
