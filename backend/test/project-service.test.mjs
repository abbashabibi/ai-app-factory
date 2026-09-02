import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject, advanceProject, recordAIResult, recordExecutionError, PROJECT_STAGES } from '../src/project-service.mjs';

test('creates a project at IDEA stage with execution state', () => {
  const project = createProject({ accountId: 'acct_1', title: 'YouTube Cooking' });
  assert.equal(project.stage, 'IDEA');
  assert.equal(project.progress, 0);
  assert.equal(project.execution.status, 'READY');
});

test('records AI output without falsely advancing the stage', () => {
  const project = createProject({ accountId: 'acct_1', title: 'Test' });
  recordAIResult(project, { objective: 'Build it' });
  assert.equal(project.stage, 'IDEA');
  assert.equal(project.execution.status, 'AI_READY');
  assert.deepEqual(project.execution.lastAIResult, { objective: 'Build it' });
});

test('records a provider error on the project', () => {
  const project = createProject({ accountId: 'acct_1', title: 'Test' });
  recordExecutionError(project, 'AI_PROVIDER_NOT_CONFIGURED');
  assert.equal(project.execution.status, 'ERROR');
  assert.equal(project.error, 'AI_PROVIDER_NOT_CONFIGURED');
});

test('advances project with monotonic progress', () => {
  const project = createProject({ accountId: 'acct_1', title: 'Test' });
  advanceProject(project, 'RESEARCHED');
  assert.equal(project.progress, 14);
  advanceProject(project, PROJECT_STAGES.at(-1));
  assert.equal(project.progress, 100);
  assert.equal(project.execution.status, 'COMPLETED');
});

test('rejects stage regression', () => {
  const project = createProject({ accountId: 'acct_1', title: 'Test' });
  advanceProject(project, 'SCRIPTED');
  assert.throws(() => advanceProject(project, 'IDEA'), /STAGE_REGRESSION/);
});
