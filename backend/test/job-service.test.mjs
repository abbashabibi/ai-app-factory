import test from 'node:test';
import assert from 'node:assert/strict';
import { createJob, startJob, updateJobStage, finishJob } from '../src/job-service.mjs';

test('job lifecycle is resumable and records attempts', () => {
  const job = createJob({ projectId: 'prj_1', accountId: 'acc_1' });
  assert.equal(job.state, 'QUEUED');
  startJob(job);
  assert.equal(job.state, 'RUNNING');
  assert.equal(job.attempt, 1);
  updateJobStage(job, 'RESEARCHED');
  assert.equal(job.currentStage, 'RESEARCHED');
  finishJob(job, 'FAILED', 'TEST_FAILURE');
  assert.equal(job.state, 'FAILED');
  assert.equal(job.error, 'TEST_FAILURE');
  startJob(job);
  assert.equal(job.state, 'RUNNING');
  assert.equal(job.attempt, 2);
  finishJob(job, 'SUCCEEDED');
  assert.equal(job.state, 'SUCCEEDED');
  assert.equal(job.error, null);
});

test('invalid transitions are rejected', () => {
  const job = createJob({ projectId: 'prj_2', accountId: 'acc_2' });
  assert.throws(() => updateJobStage(job, 'SCRIPTED'), /JOB_NOT_RUNNING/);
  startJob(job);
  assert.throws(() => startJob(job), /JOB_NOT_STARTABLE/);
});
