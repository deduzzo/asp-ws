module.exports = {
  friendlyName: 'Update extra data categoria',
  description: 'Aggiorna una categoria di dati extra esistente.',
  swagger: false,
  inputs: {
    id: {
      type: 'number',
      required: true,
      description: 'ID della categoria'
    },
    descrizione: {
      type: 'string',
      allowNull: true,
      maxLength: 255
    },
    campi: {
      type: 'json',
      description: 'Definizione campi: [{chiave, tipo, obbligatorio, etichetta}]'
    },
    attivo: {
      type: 'boolean'
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

      const updateData = {};
      if (inputs.descrizione !== undefined) updateData.descrizione = inputs.descrizione;
      if (inputs.campi !== undefined) updateData.campi = inputs.campi;
      if (inputs.attivo !== undefined) updateData.attivo = inputs.attivo;

      const updated = await Anagrafica_ExtraDataCategorie.updateOne({ id: inputs.id }).set(updateData);

      await sails.helpers.log.with({
        level: 'info',
        tag: 'ADMIN',
        message: `Extra data categoria aggiornata: ${existing.codice}`,
        action: 'EXTRA_DATA_CATEGORIA_UPDATED',
        ipAddress: this.req.ip,
        user: this.req.user || 'null',
        context: { categoriaId: inputs.id, changes: updateData }
      });

      return this.res.ApiResponse({
        data: updated
      });
    } catch (error) {
      sails.log.error('Error updating extra data categoria:', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante l\'aggiornamento della categoria'
      });
    }
  }
};
