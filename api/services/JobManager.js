// api/services/JobManager.js
module.exports = {
  jobs: new Map(),

  createJob(type, totalItems) {
    const jobId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    this.jobs.set(jobId, {
      id: jobId,
      type: type,
      totalItems: totalItems,
      processedItems: 0,
      status: 'running',
      progress: 0,
      result: null,
      createdAt: Date.now(),
      error: null
    });
    return jobId;
  },

  updateJob(jobId, { processedItems, status, result, error }) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    if (processedItems !== undefined) {
      job.processedItems = processedItems;
      job.progress = Math.floor((processedItems / job.totalItems) * 100);
    }

    if (status !== undefined) job.status = status;
    if (result !== undefined) job.result = result;
    if (error !== undefined) job.error = error;

    this.jobs.set(jobId, job);
    return job;
  },

  getJob(jobId) {
    return this.jobs.get(jobId);
  },

  // Pulizia dei job completati più vecchi di 1 ora
  cleanup() {
    const oneHourAgo = Date.now() - 3600000;
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status !== 'running' && job.createdAt < oneHourAgo) {
        this.jobs.delete(jobId);
      }
    }
  }
};
