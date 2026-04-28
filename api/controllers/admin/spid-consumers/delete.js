/* eslint-disable camelcase */
module.exports = {
  friendlyName: 'Delete SPID consumer',
  description: 'Rimuove una redirect_uri dalla whitelist SPID/CIE.',
  swagger: false,
  inputs: {id: {type: 'number', required: true}},
  fn: async function (inputs) {
    try {
      const existing = await Auth_SpidConsumers.findOne({id: inputs.id});
      if (!existing) {return this.res.ApiResponse({errType: 'NOT_FOUND', errMsg: 'Consumer non trovato'});}

      await Auth_SpidConsumers.destroyOne({id: inputs.id});

      await sails.helpers.log.with({
        level: 'warn', tag: 'ADMIN', message: `SPID consumer eliminato: ${existing.nome}`,
        action: 'SPID_CONSUMER_DELETED', ipAddress: this.req.ip,
        user: this.req.user || 'null',
        context: {id: inputs.id, redirect_uri: existing.redirect_uri}
      });

      return this.res.ApiResponse({data: {message: 'Consumer eliminato', id: inputs.id}});
    } catch (error) {
      sails.log.error('Error deleting spid_consumer:', error);
      return this.res.ApiResponse({errType: 'INTERNAL_ERROR', errMsg: 'Errore eliminazione consumer SPID'});
    }
  }
};
