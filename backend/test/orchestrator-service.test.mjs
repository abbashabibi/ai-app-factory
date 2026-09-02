import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject } from '../src/project-service.mjs';
import { createExecutionPlan, assertStageCompletion, getNextStage } from '../src/orchestrator-service.mjs';

test('orchestrator returns the next stage and task', () => {
  const project = createProject({ accountId: 'acct_1', title: 'Test' });
  const plan = createExecutionPlan(project);
  assert.equal(plan.status, 'READY');
  assert.equal(plan.currentStage, 'IDEA');
  assert.equal(plan.nextStage, 'RESEARCHED');
  assert.ok(plan.task);
});

test('orchestrator flags provider-dependent stages', () => {
  const project = createProject({ accountId: 'acct_1', title: 'Test' });
  project.stage = 'RENDERED';
  const plan = createExecutionPlan(project);
  assert.equal(plan.nextStage, 'QA_PASSED');
  assert.equal(plan.requiresProvider, false);
  project.stage = 'ASSETS_READY';
  assert.equal(createExecutionPlan(project).nextStage, 'RENDERED');
  assert.equal(createExecutionPlan(project).requiresProvider, true);
});

test('completion must match the active stage', () => {
  const project = createProject({ accountId: 'acct_1', title: 'Test' });
  const completion = assertStageCompletion(project, 'IDEA');
  assert.equal(completion.nextStage, 'RESEARCHED');
  assert.throws(() => assertStageCompletion(project, 'SCRIPTED'), /ORCHESTRATOR_STAGE_MISMATCH/);
});

test('next stage is null at completion', () => {
  assert.equal(getNextStage('ANALYZED'), null);
});
