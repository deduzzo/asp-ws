module.exports = {
  friendlyName: 'Resolve MPI app from scopes',
  description: 'Dato un array di scopi utente, ritorna l\'app MPI associata. Se l\'utente ha scope per più app, richiede specificazione esplicita.',

  inputs: {
    userScopi: {
      type: 'ref',
      required: true,
      description: 'Array degli scopi dell\'utente'
    },
    applicazioneCodice: {
      type: 'string',
      allowNull: true,
      description: 'Codice app esplicitamente specificato (opzionale)'
    }
  },

  exits: {
    success: {description: 'App risolta'},
    ambiguous: {description: 'L\'utente ha scopi per più app, serve specificazione'},
    notFound: {description: 'Nessuna app trovata per gli scopi dell\'utente'}
  },

  fn: async function (inputs, exits) {
    // Se specificata esplicitamente, verifica che l'utente abbia lo scope
    if (inputs.applicazioneCodice) {
      const writeScope = `mpi-${inputs.applicazioneCodice.toLowerCase()}-write`;
      const readScope = `mpi-${inputs.applicazioneCodice.toLowerCase()}-read`;
      const hasAccess = await sails.helpers.scopeMatches(inputs.userScopi, writeScope)
        || await sails.helpers.scopeMatches(inputs.userScopi, readScope);

      if (!hasAccess) {
        throw 'notFound';
      }

      const app = await Anagrafica_MpiApplicazioni.findOne({codice: inputs.applicazioneCodice, attivo: true});
      if (!app) {
        throw 'notFound';
      }
      return exits.success(app);
    }

    // Cerca tutte le app attive e verifica quali match con gli scopi utente
    const apps = await Anagrafica_MpiApplicazioni.find({attivo: true});
    const matchingApps = [];

    for (const app of apps) {
      const writeScope = `mpi-${app.codice.toLowerCase()}-write`;
      const readScope = `mpi-${app.codice.toLowerCase()}-read`;
      if (await sails.helpers.scopeMatches(inputs.userScopi, writeScope)
        || await sails.helpers.scopeMatches(inputs.userScopi, readScope)) {
        matchingApps.push(app);
      }
    }

    if (matchingApps.length === 0) {
      throw 'notFound';
    }

    if (matchingApps.length > 1) {
      throw {raw: matchingApps.map(a => a.codice)};
    }

    return exits.success(matchingApps[0]);
  }
};
