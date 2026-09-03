import { randomBytes } from 'node:crypto';

export const JOB_STATES = ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED'];

export function createJob({ projectId, accountId, kind = 'factory' } = {}) {
  if (!projectId || !accountId) throw new Error('INVALID_JOB');
  const now = new Date().toISOString();
  return {
    jobId: `job_${randomBytes(8).toString('hex')}`,
    projectId,
    accountId,
    kind,
    state: 'QUEUED',
    currentStage: 'IDEA',
    attempt: 0,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
    error: null,
    metadata: {},
  };
}

export function startJob(job) {
  if (!job) throw new Error('INVALID_JOB');
  if (!['QUEUED', 'FAILED'].includes(job.state)) throw new Error('JOB_NOT_STARTABLE');
  const now = new Date().toISOString();
  job.state = 'RUNNING';
  job.attempt += 1;
  job.startedAt ||= now;
  job.updatedAt = now;
  job.error = null;
  return job;
}

export function updateJobStage(job, stage) {
  if (!job || !stage) throw new Error('INVALID_JOB_STAGE');
  if (job.state !== 'RUNNING') throw new Error('JOB_NOT_RUNNING');
  job.currentStage = stage;
  job.updatedAt = new Date().toISOString();
  return job;
}

export function finishJob(job, state, error = null) {
  if (!job || !JOB_STATES.includes(state) || !['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(state)) throw new Error('INVALID_JOB_RESULT');
  const now = new Date().toISOString();
  job.state = state;
  job.error = error;
  job.updatedAt = now;
  job.finishedAt = now;
  return job;
}
