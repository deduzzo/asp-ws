/* eslint-disable camelcase */
module.exports = {
  friendlyName: 'Update SPID consumer',
  description: 'Aggiorna una redirect_uri della whitelist SPID/CIE.',
  swagger: false,
  inputs: {
    id: {type: 'number', required: true},
    nome: {type: 'string', maxLength: 100},
    slug: {type: 'string', maxLength: 50, regex: /^[a-z0-9][a-z0-9_-]{1,49}$/},
    redirect_uri: {type: 'string', maxLength: 500},
    ambito: {type: 'number', allowNull: true},
    attivo: {type: 'boolean'},
    note: {type: 'string', allowNull: true, maxLength: 500},
  },
  fn: async function (inputs) {
    try {
      const existing = await Auth_SpidConsumers.findOne({id: inputs.id});
      if (!existing) {return this.res.ApiResponse({errType: 'NOT_FOUND', errMsg: 'Consumer non trovato'});}

      const updateData = {};
      if (inputs.nome !== undefined) {updateData.nome = inputs.nome.trim();}
      if (inputs.slug !== undefined) {
        const slug = inputs.slug.trim().toLowerCase();
        if (slug !== existing.slug) {
          const dup = await Auth_SpidConsumers.findOne({slug});
          if (dup) {return this.res.ApiResponse({errType: 'ALREADY_EXISTS', errMsg: 'slug gia in uso'});}
        }
        updateData.slug = slug;
      }
      if (inputs.redirect_uri !== undefined) {
        const url = inputs.redirect_uri.trim();
        if (!/^https?:\/\//i.test(url)) {
          return this.res.ApiResponse({errType: 'BAD_REQUEST', errMsg: 'redirect_uri deve iniziare con http:// o https://'});
        }
        if (process.env.NODE_ENV === 'production' && !/^https:\/\//i.test(url)) {
          return this.res.ApiResponse({errType: 'BAD_REQUEST', errMsg: 'In produzione la redirect_uri deve essere HTTPS'});
        }
        if (url !== existing.redirect_uri) {
          const dup = await Auth_SpidConsumers.findOne({redirect_uri: url});
          if (dup) {return this.res.ApiResponse({errType: 'ALREADY_EXISTS', errMsg: 'redirect_uri gia in uso'});}
        }
        updateData.redirect_uri = url;
      }
      if (inputs.ambito !== undefined) {
        if (inputs.ambito) {
          const a = await Auth_Ambiti.findOne({id: inputs.ambito});
          if (!a) {return this.res.ApiResponse({errType: 'BAD_REQUEST', errMsg: 'Ambito non trovato'});}
        }
        updateData.ambito = inputs.ambito || null;
      }
      if (inputs.attivo !== undefined) {updateData.attivo = inputs.attivo;}
      if (inputs.note !== undefined) {updateData.note = inputs.note;}

      const updated = await Auth_SpidConsumers.updateOne({id: inputs.id}).set(updateData);

      await sails.helpers.log.with({
        level: 'info', tag: 'ADMIN', message: `SPID consumer aggiornato: ${existing.nome}`,
        action: 'SPID_CONSUMER_UPDATED', ipAddress: this.req.ip,
        user: this.req.user || 'null',
        context: {id: inputs.id, changes: updateData}
      });

      return this.res.ApiResponse({data: updated});
    } catch (error) {
      sails.log.error('Error updating spid_consumer:', error);
      return this.res.ApiResponse({errType: 'INTERNAL_ERROR', errMsg: 'Errore aggiornamento consumer SPID'});
    }
  }
};
