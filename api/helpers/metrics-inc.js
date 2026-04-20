/**
 * metrics-inc helper
 *
 * Atomically increments a counter in the metrics_counters table.
 * Uses INSERT ... ON DUPLICATE KEY UPDATE cnt = cnt + 1.
 * Fire-and-forget — errors are logged but never block the caller.
 */
module.exports = {
  friendlyName: 'Metrics increment',

  sync: false,

  inputs: {
    metric: { type: 'string', required: true },
    label1Name: { type: 'string', defaultsTo: '' },
    label1Value: { type: 'string', defaultsTo: '' },
    label2Name: { type: 'string', defaultsTo: '' },
    label2Value: { type: 'string', defaultsTo: '' },
  },

  async fn(inputs, exits) {
    try {
      const db = Log.getDatastore();
      await db.sendNativeQuery(
        `INSERT INTO metrics_counters (metric, label1_name, label1_value, label2_name, label2_value, cnt)
         VALUES ($1, $2, $3, $4, $5, 1)
         ON DUPLICATE KEY UPDATE cnt = cnt + 1`,
        [inputs.metric, inputs.label1Name, inputs.label1Value, inputs.label2Name, inputs.label2Value]
      );
    } catch (err) {
      sails.log.warn('[metrics-inc] Error incrementing counter:', err.message);
    }
    return exits.success();
  }
};
