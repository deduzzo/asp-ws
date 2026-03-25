/**
 * @swagger
 *
 * /link:
 *   tags:
 *     - MPI
 */

const {ERROR_TYPES} = require('../../responses/ApiResponse');

module.exports = {
  friendlyName: 'MPI Link',
  description: 'Collega un record MPI a un assistito dell\'anagrafica principale tramite codice fiscale.',

  inputs: {
    mpiId: {type: 'string', required: true},
    cf: {type: 'string', required: true, description: 'Codice fiscale dell\'assistito'},
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

      if (record.stato !== 'aperto') {
        return res.ApiResponse({
          errType: ERROR_TYPES.ERRORE_GENERICO,
          errMsg: `Impossibile collegare: il record è in stato "${record.stato}"`
        });
      }

      // Verifica scope mpi-link
      if (!await sails.helpers.scopeMatches(req.tokenData.scopi, 'mpi-link')) {
        return res.ApiResponse({errType: ERROR_TYPES.NON_AUTORIZZATO, errMsg: 'Non hai il permesso di collegare record MPI'});
      }

      // Cerca assistito per CF
      let assistito = await Anagrafica_Assistiti.findOne({cf: inputs.cf.toUpperCase()});

      // Se non trovato, prova SistemaTS
      if (!assistito) {
        try {
          const {AssistitoService} = require('../../services/AssistitoService');
          const datiTs = await AssistitoService.getAssistitoFromCf(inputs.cf, true, false);
          if (datiTs) {
            assistito = await Anagrafica_Assistiti.findOne({cf: inputs.cf.toUpperCase()});
          }
        } catch (tsErr) {
          sails.log.warn('SistemaTS lookup fallito durante MPI link:', tsErr.message);
        }
      }

      if (!assistito) {
        return res.ApiResponse({
          errType: ERROR_TYPES.NON_TROVATO,
          errMsg: 'Assistito non trovato in anagrafica e SistemaTS'
        });
      }

      // Effettua il link
      await Anagrafica_MpiRecord.updateOne({id: record.id}).set({
        assistito: assistito.id,
        stato: 'identificato',
        dataIdentificazione: Date.now(),
        utenteIdentificazione: req.tokenData.username,
      });

      await Anagrafica_MpiRecordStorico.create({
        mpiRecord: record.id,
        operazione: 'LINK',
        dettaglio: {cf: assistito.cf, assistitoId: assistito.id, nome: assistito.nome, cognome: assistito.cognome},
        utente: req.tokenData.username,
        ipAddress: req.ip,
      });

      await sails.helpers.log.with({
        level: 'info',
        tag: 'MPI_LINK',
        message: `Record MPI ${inputs.mpiId} collegato a ${assistito.cf}`,
        action: 'mpi-link',
        ipAddress: req.ip,
        user: req.tokenData.username,
        context: {mpiId: inputs.mpiId, cf: assistito.cf}
      });

      return res.ApiResponse({
        data: {
          mpiId: inputs.mpiId,
          stato: 'identificato',
          assistito: {cf: assistito.cf, nome: assistito.nome, cognome: assistito.cognome}
        }
      });
    } catch (err) {
      sails.log.error('Errore MPI link:', err);
      return res.ApiResponse({errType: ERROR_TYPES.ERRORE_DEL_SERVER, errMsg: 'Errore durante il collegamento'});
    }
  }
};
