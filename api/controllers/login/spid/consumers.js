/* eslint-disable camelcase */
/**
 * @swagger
 *
 * /consumers:
 *   tags:
 *     - Auth SPID
 */

module.exports = {
  friendlyName: 'SpidConsumers',

  description: 'Restituisce la lista dei consumer SPID/CIE attivi (slug + nome). Usato dalle app integranti per scoprire l\'identificativo da passare al parametro consumer di /login/spid/start. Pubblico, no auth. Non espone la redirect_uri associata (configurazione interna).',

  inputs: {},

  exits: {},

  fn: async function () {
    const res = this.res;
    try {
      const rows = await Auth_SpidConsumers.find({attivo: true, sort: 'nome ASC'}).populate('ambito');
      const consumers = rows.map(c => ({
        slug: c.slug,
        nome: c.nome,
        ambito: c.ambito ? c.ambito.ambito : null,
      }));
      return res.ApiResponse({data: {consumers}});
    } catch (err) {
      sails.log.error('[spid/consumers] Errore lettura consumer:', err.message);
      return res.ApiResponse({
        errType: 'ERRORE_DEL_SERVER',
        errMsg: 'Errore lettura consumer'
      });
    }
  }
};
