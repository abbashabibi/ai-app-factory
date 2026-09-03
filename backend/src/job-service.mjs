import { randomBytes } from 'node:crypto';
import { PROJECT_STAGES } from './project-service.mjs';

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
  job.startedAt = now;
  job.finishedAt = null;
  job.updatedAt = now;
  job.error = null;
  return job;
}

export function updateJobStage(job, stage) {
  if (!job || !stage || !PROJECT_STAGES.includes(stage)) throw new Error('INVALID_JOB_STAGE');
  if (job.state !== 'RUNNING') throw new Error('JOB_NOT_RUNNING');
  const current = PROJECT_STAGES.indexOf(job.currentStage);
  const next = PROJECT_STAGES.indexOf(stage);
  if (next < current) throw new Error('JOB_STAGE_REGRESSION');
  job.currentStage = stage;
  job.updatedAt = new Date().toISOString();
  return job;
}

export function finishJob(job, state, error = null) {
  if (!job || !['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(state)) throw new Error('INVALID_JOB_RESULT');
  if (job.state !== 'RUNNING') throw new Error('JOB_NOT_RUNNING');
  if (state === 'SUCCEEDED' && job.currentStage !== PROJECT_STAGES.at(-1)) throw new Error('JOB_NOT_COMPLETE');
  const now = new Date().toISOString();
  job.state = state;
  job.error = error;
  job.updatedAt = now;
  job.finishedAt = now;
  return job;
}
