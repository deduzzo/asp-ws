module.exports = {
  friendlyName: 'Delete MPI applicazione',
  description: 'Disattiva un\'applicazione MPI (soft delete).',
  swagger: false,
  inputs: {
    id: {type: 'number', required: true},
  },
  fn: async function (inputs, exits) {
    try {
      const existing = await Anagrafica_MpiApplicazioni.findOne({id: inputs.id});
      if (!existing) {
        return this.res.ApiResponse({
          errType: 'NOT_FOUND',
          errMsg: 'Applicazione non trovata'
        });
      }

      // Verifica se ci sono record MPI aperti per questa app
      const openRecords = await Anagrafica_MpiRecord.count({applicazione: inputs.id, stato: 'aperto'});
      if (openRecords > 0) {
        return this.res.ApiResponse({
          errType: 'ERRORE_GENERICO',
          errMsg: `Impossibile eliminare: ci sono ${openRecords} record MPI aperti per questa applicazione`
        });
      }

      await Anagrafica_MpiApplicazioni.updateOne({id: inputs.id}).set({attivo: false});

      await sails.helpers.log.with({
        level: 'info',
        tag: 'MPI_ADMIN',
        message: `Applicazione MPI disattivata: ${existing.codice}`,
        action: 'MPI_APP_DELETED',
        ipAddress: this.req.ip,
        user: this.req.user || 'null',
        context: {appId: inputs.id, codice: existing.codice}
      });

      return this.res.ApiResponse({data: {message: 'Applicazione disattivata'}});
    } catch (error) {
      sails.log.error('Error deleting MPI applicazione:', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante la disattivazione dell\'applicazione MPI'
      });
    }
  }
};
