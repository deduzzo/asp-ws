/* eslint-disable camelcase */
module.exports = {
  friendlyName: 'List SPID consumers',
  description: 'Elenco delle redirect_uri ammesse per il login SPID/CIE.',
  swagger: false,
  inputs: {},
  fn: async function () {
    try {
      const consumers = await Auth_SpidConsumers.find({sort: 'nome ASC'}).populate('ambito');
      return this.res.ApiResponse({
        data: {
          consumers: consumers.map(c => ({
            id: c.id,
            nome: c.nome,
            redirect_uri: c.redirect_uri,
            ambito: c.ambito ? {id: c.ambito.id, ambito: c.ambito.ambito} : null,
            attivo: c.attivo,
            note: c.note,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          }))
        }
      });
    } catch (error) {
      sails.log.error('Error listing spid_consumers:', error);
      return this.res.ApiResponse({errType: 'INTERNAL_ERROR', errMsg: 'Errore caricamento consumer SPID'});
    }
  }
};
