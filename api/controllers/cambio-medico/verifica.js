/**
 * @swagger
 *
 * /verifica:
 *   tags:
 *     - Cambio Medico
 */
const MediciService = require('../../services/MediciService');
const {TAGS} = require('../../models/Log');
const ApiResponse = require('../../responses/ApiResponse');

module.exports = {

  friendlyName: 'Verifica medico assistito su NAR2 e TS',

  description: 'Legge i dati del medico assegnato a un assistito da NAR2 e da Sistema TS (Sogei) in parallelo, restituisce i due snapshot e l\'esito di coerenza. Utile per verificare che un cambio medico effettuato su NAR2 sia stato effettivamente propagato al Sistema TS (allineamento via trigger asincrono).',

  inputs: {
    cfAssistito: {
      type: 'string',
      required: true,
      description: 'Codice fiscale dell\'assistito'
    },
    pfIdAtteso: {
      type: 'number',
      description: 'pf_id atteso del medico (per match esplicito) — opzionale'
    },
    codRegAtteso: {
      type: 'string',
      description: 'Codice regionale atteso del medico — opzionale'
    },
    cfMedicoAtteso: {
      type: 'string',
      description: 'Codice fiscale atteso del medico — opzionale'
    }
  },

  exits: {},

  fn: async function (inputs) {
    const ip = this.req.ip || (this.req.connection && this.req.connection.remoteAddress);
    const user = (this.req.tokenData && this.req.tokenData.username) || null;

    const atteso = (inputs.pfIdAtteso || inputs.codRegAtteso || inputs.cfMedicoAtteso) ? {
      pfId: inputs.pfIdAtteso,
      codReg: inputs.codRegAtteso,
      cfMedico: inputs.cfMedicoAtteso
    } : null;

    try {
      const result = await MediciService.verificaCambioMedico(inputs.cfAssistito, atteso);

      let tag = TAGS.CAMBIO_MEDICO_VERIFICA_COERENTI;
      let esito = 'coerenti';
      if (result.divergenza === 'medici_diversi') {tag = TAGS.CAMBIO_MEDICO_VERIFICA_DIVERGENTI; esito = 'divergenti';}
      else if (result.divergenza === 'ts_non_aggiornato') {tag = TAGS.CAMBIO_MEDICO_VERIFICA_TS_NON_AGGIORNATO; esito = 'ts_non_aggiornato';}
      else if (result.divergenza === 'nar2_non_aggiornato') {tag = TAGS.CAMBIO_MEDICO_VERIFICA_NAR2_NON_AGGIORNATO; esito = 'nar2_non_aggiornato';}
      else if (result.divergenza === 'errore') {tag = TAGS.CAMBIO_MEDICO_VERIFICA_ERRORE; esito = 'errore';}

      // Counter Prometheus
      const mSql = 'INSERT INTO metrics_counters (metric, label1_name, label1_value, cnt) VALUES ($1, $2, $3, 1) ON DUPLICATE KEY UPDATE cnt = cnt + 1';
      Log.getDatastore().sendNativeQuery(mSql, ['cambio_medico_verifica', 'esito', esito]).catch(() => {});

      await sails.helpers.log.with({
        level: result.divergenza ? 'warn' : 'info',
        tag,
        message: `Verifica cambio medico cf=${inputs.cfAssistito} esito=${result.divergenza || 'coerenti'}`,
        action: 'cambio-medico/verifica',
        user,
        ipAddress: ip,
        context: {
          cfAssistito: inputs.cfAssistito,
          coerenti: result.coerenti,
          divergenza: result.divergenza,
          medicoNar2: (result.nar2.medico && (result.nar2.medico.cfMedico || result.nar2.medico.codReg)) || null,
          medicoTs: (result.ts.medico && (result.ts.medico.cfMedico || result.ts.medico.codReg)) || null,
          matchAtteso: result.matchAtteso
        }
      });

      return this.res.ApiResponse({data: result});
    } catch (err) {
      const mSql = 'INSERT INTO metrics_counters (metric, label1_name, label1_value, cnt) VALUES ($1, $2, $3, 1) ON DUPLICATE KEY UPDATE cnt = cnt + 1';
      Log.getDatastore().sendNativeQuery(mSql, ['cambio_medico_verifica', 'esito', 'errore']).catch(() => {});
      sails.log.error('[cambio-medico/verifica] Eccezione:', err);
      await sails.helpers.log.with({
        level: 'error',
        tag: TAGS.CAMBIO_MEDICO_VERIFICA_ERRORE,
        message: 'Eccezione durante verifica cambio medico: ' + err.message,
        action: 'cambio-medico/verifica',
        user,
        ipAddress: ip,
        context: {cfAssistito: inputs.cfAssistito, error: err.message}
      });
      return this.res.ApiResponse({errType: ApiResponse.ERROR_TYPES.ERRORE_DEL_SERVER, errMsg: 'Errore interno durante la verifica del cambio medico'});
    }
  }
};
