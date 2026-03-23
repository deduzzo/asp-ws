module.exports = {
  friendlyName: 'Scope matches',

  description: 'Verifica se un array di scope utente matcha uno scope richiesto, con supporto wildcard (*). ' +
    'Es: "anagrafica-hl7_*-read" matcha "anagrafica-hl7_allergie-read".',

  sync: true,

  inputs: {
    userScopi: {
      type: 'ref',
      required: true,
      description: 'Array di scope dell\'utente'
    },
    requiredScope: {
      type: 'string',
      required: true,
      description: 'Scope richiesto da verificare'
    }
  },

  fn: function (inputs, exits) {
    const { userScopi, requiredScope } = inputs;

    if (!userScopi || !Array.isArray(userScopi) || userScopi.length === 0) {
      return exits.success(false);
    }

    const required = requiredScope.toLowerCase();

    for (const scope of userScopi) {
      const s = scope.toLowerCase();

      // Match esatto
      if (s === required) return exits.success(true);

      // Match wildcard: converti * in regex .*
      if (s.includes('*')) {
        const pattern = '^' + s.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
        if (new RegExp(pattern).test(required)) return exits.success(true);
      }
    }

    return exits.success(false);
  }
};
