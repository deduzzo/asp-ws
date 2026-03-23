module.exports = {
  friendlyName: 'Cerca assistito per extra data',
  description: 'Cerca un assistito per codice fiscale/STP per la gestione extra data da admin.',
  swagger: false,
  inputs: {
    cf: {
      type: 'string',
      required: true,
      minLength: 3,
      description: 'Codice fiscale o STP (minimo 3 caratteri)'
    }
  },
  fn: async function (inputs, exits) {
    try {
      const assistiti = await Anagrafica_Assistiti.find({
        where: { cf: { like: `%${inputs.cf}%` } },
        limit: 20
      });

      return this.res.ApiResponse({
        data: {
          assistiti: assistiti.map(a => ({
            id: a.id,
            cf: a.cf,
            nome: a.nome,
            cognome: a.cognome
          }))
        }
      });
    } catch (error) {
      sails.log.error('Error searching assistito for extra data:', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante la ricerca dell\'assistito'
      });
    }
  }
};
