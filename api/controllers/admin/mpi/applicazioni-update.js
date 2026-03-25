module.exports = {
  friendlyName: 'Update MPI applicazione',
  description: 'Aggiorna un\'applicazione MPI.',
  swagger: false,
  inputs: {
    id: {type: 'number', required: true},
    nome: {type: 'string', maxLength: 255},
    descrizione: {type: 'string', allowNull: true},
    versione: {type: 'string', allowNull: true, maxLength: 20},
    contatto: {type: 'string', allowNull: true, maxLength: 255},
    attivo: {type: 'boolean'},
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

      const updateData = {};
      if (inputs.nome !== undefined) updateData.nome = inputs.nome;
      if (inputs.descrizione !== undefined) updateData.descrizione = inputs.descrizione;
      if (inputs.versione !== undefined) updateData.versione = inputs.versione;
      if (inputs.contatto !== undefined) updateData.contatto = inputs.contatto;
      if (inputs.attivo !== undefined) updateData.attivo = inputs.attivo;

      const updated = await Anagrafica_MpiApplicazioni.updateOne({id: inputs.id}).set(updateData);

      await sails.helpers.log.with({
        level: 'info',
        tag: 'MPI_ADMIN',
        message: `Applicazione MPI aggiornata: ${existing.codice}`,
        action: 'MPI_APP_UPDATED',
        ipAddress: this.req.ip,
        user: this.req.user || 'null',
        context: {appId: inputs.id, changes: Object.keys(updateData)}
      });

      return this.res.ApiResponse({data: updated});
    } catch (error) {
      sails.log.error('Error updating MPI applicazione:', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante l\'aggiornamento dell\'applicazione MPI'
      });
    }
  }
};
