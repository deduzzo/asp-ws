/**
 * @swagger
 *
 * /effettua-cambio:
 *   tags:
 *     - Cambio Medico
 */
const MediciService = require('../../services/MediciService');
const {TAGS} = require('../../models/Log');
const ApiResponse = require('../../responses/ApiResponse');

module.exports = {

  friendlyName: 'Effettua cambio medico',

  description: 'Esegue il submit del cambio medico su NAR2 (POST /pazienti/sceltaMedico). Default dryRun=true: ritorna il payload senza inviare. Per inviare davvero, passare dryRun=false.',

  inputs: {
    cfAssistito: {
      type: 'string',
      required: true,
      description: 'Codice fiscale dell\'assistito'
    },
    pfIdMedico: {
      type: 'number',
      required: true,
      description: 'pf_id del medico scelto (campo pf_id da get-medici-disponibili-assistito)'
    },
    dryRun: {
      type: 'boolean',
      defaultsTo: true,
      description: 'Se true ritorna il payload senza inviare. DEFAULT TRUE per sicurezza.'
    },
    tipoMedico: {
      type: 'string',
      isIn: ['M', 'P'],
      defaultsTo: 'M',
      description: 'M = MMG, P = Pediatra'
    },
    codiceSituazioneAssistenziale: {
      type: 'string',
      description: 'sa_cod situazione assistenziale (default 13 = Cambio medico nell\'ASL)'
    },
    idSituazioneAssistenziale: {
      type: 'string',
      description: 'Override diretto sa_id (bypassa la lookup per sa_cod)'
    },
    idAmbitoScelta: {
      type: 'string',
      description: 'Override sr_id ambito di scelta (default = ambito di domicilio)'
    },
    idAmbitoDomicilio: {
      type: 'string',
      description: 'Override sr_id ambito di domicilio'
    },
    motivoScelta: {
      type: 'string',
      description: 'Override pm_mot_scelta (default dedotto dalla situazione)'
    },
    tipoOperazioneScelta: {
      type: 'string',
      description: 'Override dm_tipoop_scelta (default dedotto dalla situazione)'
    },
    forzaSenzaRevoca: {
      type: 'boolean',
      defaultsTo: false,
      description: 'Se true non aggiunge revoca anche se esiste medico precedente'
    }
  },

  exits: {},

  fn: async function (inputs) {
    const ip = this.req.ip || (this.req.connection && this.req.connection.remoteAddress);
    const user = (this.req.tokenData && this.req.tokenData.username) || null;

    const config = {
      dryRun: inputs.dryRun,
      tipoMedico: inputs.tipoMedico,
      forzaSenzaRevoca: inputs.forzaSenzaRevoca
    };
    if (inputs.codiceSituazioneAssistenziale) {config.codiceSituazioneAssistenziale = inputs.codiceSituazioneAssistenziale;}
    if (inputs.idSituazioneAssistenziale) {config.idSituazioneAssistenziale = inputs.idSituazioneAssistenziale;}
    if (inputs.idAmbitoScelta) {config.idAmbitoScelta = inputs.idAmbitoScelta;}
    if (inputs.idAmbitoDomicilio) {config.idAmbitoDomicilio = inputs.idAmbitoDomicilio;}
    if (inputs.motivoScelta) {config.motivoScelta = inputs.motivoScelta;}
    if (inputs.tipoOperazioneScelta) {config.tipoOperazioneScelta = inputs.tipoOperazioneScelta;}

    try {
      const result = await MediciService.effettuaCambioMedico(inputs.cfAssistito, inputs.pfIdMedico, config);

      let tag;
      let esito;
      if (result.dryRun) {tag = TAGS.CAMBIO_MEDICO_SUBMIT_DRY_RUN; esito = 'dry_run';}
      else if (result.ok) {tag = TAGS.CAMBIO_MEDICO_SUBMIT_OK; esito = 'ok';}
      else {tag = TAGS.CAMBIO_MEDICO_SUBMIT_KO; esito = 'ko';}

      // Counter Prometheus
      const mSql = 'INSERT INTO metrics_counters (metric, label1_name, label1_value, cnt) VALUES ($1, $2, $3, 1) ON DUPLICATE KEY UPDATE cnt = cnt + 1';
      Log.getDatastore().sendNativeQuery(mSql, ['cambio_medico_submit', 'esito', esito]).catch(() => {});

      await sails.helpers.log.with({
        level: result.ok ? 'info' : 'warn',
        tag,
        message: `Cambio medico ${result.dryRun ? 'DRY-RUN' : (result.ok ? 'OK' : 'KO')} cf=${inputs.cfAssistito} pf_id=${inputs.pfIdMedico}`,
        action: 'cambio-medico/effettua-cambio',
        user,
        ipAddress: ip,
        context: {
          cfAssistito: inputs.cfAssistito,
          pfIdMedico: inputs.pfIdMedico,
          dryRun: result.dryRun,
          ok: result.ok,
          error: result.error || null,
          newPmId: (result.data && result.data.pm_id) || null
        }
      });

      if (!result.ok) {
        return this.res.ApiResponse({errType: ApiResponse.ERROR_TYPES.BAD_REQUEST, errMsg: result.error || 'Cambio medico fallito'});
      }
      return this.res.ApiResponse({
        data: {
          ok: result.ok,
          dryRun: result.dryRun,
          payload: result.payload,
          response: result.data || null,
          newPmId: (result.data && result.data.pm_id) || null,
          newPmRMedico: (result.data && result.data.pm_r_medico) || null
        }
      });
    } catch (err) {
      const mSql = 'INSERT INTO metrics_counters (metric, label1_name, label1_value, cnt) VALUES ($1, $2, $3, 1) ON DUPLICATE KEY UPDATE cnt = cnt + 1';
      Log.getDatastore().sendNativeQuery(mSql, ['cambio_medico_submit', 'esito', 'ko']).catch(() => {});
      sails.log.error('[cambio-medico/effettua-cambio] Eccezione:', err);
      await sails.helpers.log.with({
        level: 'error',
        tag: TAGS.CAMBIO_MEDICO_SUBMIT_KO,
        message: 'Eccezione durante cambio medico: ' + err.message,
        action: 'cambio-medico/effettua-cambio',
        user,
        ipAddress: ip,
        context: {cfAssistito: inputs.cfAssistito, pfIdMedico: inputs.pfIdMedico, error: err.message}
      });
      return this.res.ApiResponse({errType: ApiResponse.ERROR_TYPES.ERRORE_DEL_SERVER, errMsg: 'Errore interno durante il submit del cambio medico'});
    }
  }
};
