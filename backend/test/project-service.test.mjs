import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject, advanceProject, PROJECT_STAGES } from '../src/project-service.mjs';

test('creates a project at IDEA stage', () => {
  const project = createProject({ accountId: 'acct_1', title: 'YouTube Cooking' });
  assert.equal(project.stage, 'IDEA');
  assert.equal(project.progress, 0);
});

test('advances project with monotonic progress', () => {
  const project = createProject({ accountId: 'acct_1', title: 'Test' });
  advanceProject(project, 'RESEARCHED');
  assert.equal(project.progress, 14);
  advanceProject(project, PROJECT_STAGES.at(-1));
  assert.equal(project.progress, 100);
});

test('rejects stage regression', () => {
  const project = createProject({ accountId: 'acct_1', title: 'Test' });
  advanceProject(project, 'SCRIPTED');
  assert.throws(() => advanceProject(project, 'IDEA'), /STAGE_REGRESSION/);
});
