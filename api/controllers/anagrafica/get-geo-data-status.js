/**
 * @swagger
 *
 * /get-geo-data-status:
 *   tags:
 *     - Anagrafica
 */

const {getJob} = require('../../services/JobManager');
module.exports = {
  friendlyName: 'Stato del job di geolocalizzazione',
  description: 'Ottieni lo stato del job di geolocalizzazione',
  inputs: {
    jobId: {
      type: 'string',
      required: true,
      description: 'ID del job'
    }
  },
  exits: {},

  fn: async function (inputs) {
    const res = this.res;
    const job = getJob(inputs.jobId);

    if (!job) {
      return res.ApiResponse({
        errType: ERROR_TYPES.NOT_FOUND,
        errMsg: 'Job non trovato'
      });
    }

    return res.ApiResponse({
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        result: job.status === 'completed' ? job.result : null,
        error: job.error
      }
    });
  }
};
