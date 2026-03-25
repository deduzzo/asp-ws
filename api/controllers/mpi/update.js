/**
 * @swagger
 *
 * /update:
 *   tags:
 *     - MPI
 */

const {ERROR_TYPES} = require('../../responses/ApiResponse');

module.exports = {
  friendlyName: 'MPI Update',
  description: 'Aggiorna i campi demografici di un record MPI aperto.',

  inputs: {
    mpiId: {type: 'string', required: true},
    idEsterno: {type: 'string'},
    cf: {type: 'string'},
    cognome: {type: 'string'},
    nome: {type: 'string'},
    sesso: {type: 'string'},
    dataNascita: {type: 'number'},
    comuneNascita: {type: 'string'},
    codComuneNascita: {type: 'string'},
    codIstatComuneNascita: {type: 'string'},
    provinciaNascita: {type: 'string'},
    indirizzoResidenza: {type: 'string'},
    capResidenza: {type: 'string'},
    comuneResidenza: {type: 'string'},
    codComuneResidenza: {type: 'string'},
    codIstatComuneResidenza: {type: 'string'},
    asp: {type: 'string'},
    ssnTipoAssistito: {type: 'string'},
    ssnInizioAssistenza: {type: 'number'},
    ssnFineAssistenza: {type: 'number'},
    ssnMotivazioneFineAssistenza: {type: 'string'},
    ssnNumeroTessera: {type: 'string'},
    dataDecesso: {type: 'number'},
    note: {type: 'string'},
  },

  fn: async function (inputs, exits) {
    const req = this.req;
    const res = this.res;

    try {
      const record = await Anagrafica_MpiRecord.findOne({mpiId: inputs.mpiId})
        .populate('applicazione');

      if (!record) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_TROVATO, errMsg: 'Record MPI non trovato'});
      }

      if (record.stato === 'annullato') {
        return res.ApiResponse({errType: ERROR_TYPES.ERRORE_GENERICO, errMsg: 'Impossibile aggiornare un record annullato'});
      }

      // Verifica scope write
      const appCodice = record.applicazione.codice.toLowerCase();
      if (!await sails.helpers.scopeMatches(req.tokenData.scopi, `mpi-${appCodice}-write`)) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_AUTORIZZATO, errMsg: 'Non hai i permessi di scrittura per questa applicazione MPI'});
      }

      const updateData = {};
      const oldValues = {};
      const campi = [
        'idEsterno', 'cf', 'cognome', 'nome', 'sesso', 'dataNascita',
        'comuneNascita', 'codComuneNascita', 'codIstatComuneNascita', 'provinciaNascita',
        'indirizzoResidenza', 'capResidenza', 'comuneResidenza', 'codComuneResidenza', 'codIstatComuneResidenza',
        'asp', 'ssnTipoAssistito', 'ssnInizioAssistenza', 'ssnFineAssistenza',
        'ssnMotivazioneFineAssistenza', 'ssnNumeroTessera', 'dataDecesso', 'note'
      ];

      for (const campo of campi) {
        if (inputs[campo] !== undefined) {
          oldValues[campo] = record[campo];
          updateData[campo] = inputs[campo];
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.ApiResponse({errType: ERROR_TYPES.ERRORE_GENERICO, errMsg: 'Nessun campo da aggiornare'});
      }

      await Anagrafica_MpiRecord.updateOne({id: record.id}).set(updateData);

      await Anagrafica_MpiRecordStorico.create({
        mpiRecord: record.id,
        operazione: 'UPDATE',
        dettaglio: {old: oldValues, new: updateData},
        utente: req.tokenData.username,
        ipAddress: req.ip,
      });

      await sails.helpers.log.with({
        level: 'info',
        tag: 'MPI_UPDATE',
        message: `Record MPI aggiornato: ${inputs.mpiId}`,
        action: 'mpi-update',
        ipAddress: req.ip,
        user: req.tokenData.username,
        context: {mpiId: inputs.mpiId, campiAggiornati: Object.keys(updateData)}
      });

      return res.ApiResponse({data: {mpiId: inputs.mpiId, aggiornati: Object.keys(updateData)}});
    } catch (err) {
      sails.log.error('Errore MPI update:', err);
      return res.ApiResponse({errType: ERROR_TYPES.ERRORE_DEL_SERVER, errMsg: 'Errore durante l\'aggiornamento'});
    }
  }
};
