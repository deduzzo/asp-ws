module.exports = {
  friendlyName: 'Delete extra data categoria',
  description: 'Elimina una categoria di dati extra e tutti i valori/storico associati.',
  swagger: false,
  inputs: {
    id: {
      type: 'number',
      required: true,
      description: 'ID della categoria da eliminare'
    }
  },
  fn: async function (inputs, exits) {
    try {
      const existing = await Anagrafica_ExtraDataCategorie.findOne({ id: inputs.id });
      if (!existing) {
        return this.res.ApiResponse({
          errType: 'NOT_FOUND',
          errMsg: 'Categoria non trovata'
        });
      }

      // Elimina storico, valori e categoria (cascade in SQL, ma puliamo esplicitamente)
      const valori = await Anagrafica_ExtraDataValori.find({ categoria: inputs.id });
      if (valori.length > 0) {
        const valoriIds = valori.map(v => v.id);
        await Anagrafica_ExtraDataStorico.destroy({ valore: { in: valoriIds } });
        await Anagrafica_ExtraDataValori.destroy({ categoria: inputs.id });
      }

      await Anagrafica_ExtraDataCategorie.destroyOne({ id: inputs.id });

      await sails.helpers.log.with({
        level: 'warn',
        tag: 'ADMIN',
        message: `Extra data categoria eliminata: ${existing.codice}`,
        action: 'EXTRA_DATA_CATEGORIA_DELETED',
        ipAddress: this.req.ip,
        user: this.req.user || 'null',
        context: { categoriaId: inputs.id, codice: existing.codice }
      });

      return this.res.ApiResponse({
        data: { message: 'Categoria eliminata con successo', codice: existing.codice }
      });
    } catch (error) {
      sails.log.error('Error deleting extra data categoria:', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante l\'eliminazione della categoria'
      });
    }
  }
};
