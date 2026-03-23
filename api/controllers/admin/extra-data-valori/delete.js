module.exports = {
  friendlyName: 'Delete extra data assistito (admin)',
  description: 'Elimina un valore extra di un assistito. Admin bypassa il controllo scope categoria.',
  swagger: false,
  inputs: {
    assistitoId: {
      type: 'number',
      required: true
    },
    categoria: {
      type: 'string',
      required: true,
      description: 'Codice della categoria'
    },
    chiave: {
      type: 'string',
      required: true,
      description: 'Chiave del valore da eliminare'
    }
  },
  fn: async function (inputs, exits) {
    try {
      const username = this.req.user;
      const ipAddress = this.req.ip;

      const cat = await Anagrafica_ExtraDataCategorie.findOne({ codice: inputs.categoria.toUpperCase(), attivo: true });
      if (!cat) {
        return this.res.ApiResponse({
          errType: 'NOT_FOUND',
          errMsg: 'Categoria non trovata o non attiva'
        });
      }

      const existing = await Anagrafica_ExtraDataValori.findOne({
        assistito: inputs.assistitoId,
        categoria: cat.id,
        chiave: inputs.chiave
      });

      if (!existing) {
        return this.res.ApiResponse({
          errType: 'NOT_FOUND',
          errMsg: 'Valore non trovato'
        });
      }

      await Anagrafica_ExtraDataStorico.create({
        valore: existing.id,
        vecchioValore: existing.valore,
        nuovoValore: null,
        operazione: 'DELETE',
        utente: username,
        ipAddress
      });

      await Anagrafica_ExtraDataValori.destroyOne({ id: existing.id });

      return this.res.ApiResponse({
        data: { message: 'Valore eliminato con successo' }
      });
    } catch (error) {
      sails.log.error('Error deleting extra data (admin):', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante l\'eliminazione del valore'
      });
    }
  }
};
