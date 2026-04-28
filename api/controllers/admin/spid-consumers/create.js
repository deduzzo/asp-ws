/* eslint-disable camelcase */
module.exports = {
  friendlyName: 'Create SPID consumer',
  description: 'Aggiunge una nuova redirect_uri alla whitelist SPID/CIE.',
  swagger: false,
  inputs: {
    nome: {type: 'string', required: true, maxLength: 100},
    redirect_uri: {type: 'string', required: true, maxLength: 500},
    ambito: {type: 'number', allowNull: true, description: 'ID dell\'ambito associato (opzionale)'},
    attivo: {type: 'boolean', defaultsTo: true},
    note: {type: 'string', allowNull: true, maxLength: 500},
  },
  fn: async function (inputs) {
    try {
      const url = (inputs.redirect_uri || '').trim();
      if (!/^https?:\/\//i.test(url)) {
        return this.res.ApiResponse({errType: 'BAD_REQUEST', errMsg: 'redirect_uri deve iniziare con http:// o https://'});
      }
      if (process.env.NODE_ENV === 'production' && !/^https:\/\//i.test(url)) {
        return this.res.ApiResponse({errType: 'BAD_REQUEST', errMsg: 'In produzione la redirect_uri deve essere HTTPS'});
      }

      const existing = await Auth_SpidConsumers.findOne({redirect_uri: url});
      if (existing) {
        return this.res.ApiResponse({errType: 'ALREADY_EXISTS', errMsg: 'redirect_uri gia presente'});
      }

      if (inputs.ambito) {
        const a = await Auth_Ambiti.findOne({id: inputs.ambito});
        if (!a) {return this.res.ApiResponse({errType: 'BAD_REQUEST', errMsg: 'Ambito non trovato'});}
      }

      const created = await Auth_SpidConsumers.create({
        nome: inputs.nome.trim(),
        redirect_uri: url,
        ambito: inputs.ambito || null,
        attivo: inputs.attivo !== undefined ? inputs.attivo : true,
        note: inputs.note || null,
      }).fetch();

      await sails.helpers.log.with({
        level: 'info', tag: 'ADMIN', message: `SPID consumer creato: ${created.nome}`,
        action: 'SPID_CONSUMER_CREATED', ipAddress: this.req.ip,
        user: this.req.user || 'null',
        context: {id: created.id, redirect_uri: url}
      });

      return this.res.ApiResponse({data: created});
    } catch (error) {
      sails.log.error('Error creating spid_consumer:', error);
      return this.res.ApiResponse({errType: 'INTERNAL_ERROR', errMsg: 'Errore creazione consumer SPID'});
    }
  }
};
