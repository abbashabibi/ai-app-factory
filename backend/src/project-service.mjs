import { randomBytes } from 'node:crypto';

export const PROJECT_STAGES = [
  'IDEA', 'RESEARCHED', 'SCRIPTED', 'ASSETS_READY', 'RENDERED', 'QA_PASSED', 'UPLOADED', 'ANALYZED'
];

export function createProject({ accountId, title, brief = '' } = {}) {
  if (!accountId || !title) throw new Error('INVALID_PROJECT');
  const now = new Date().toISOString();
  return {
    projectId: `prj_${randomBytes(8).toString('hex')}`,
    accountId,
    title,
    brief,
    stage: 'IDEA',
    progress: 0,
    createdAt: now,
    updatedAt: now,
    error: null,
    execution: {
      status: 'READY',
      lastAIResult: null,
      lastAIAt: null,
      lastError: null,
    },
  };
}

export function recordAIResult(project, result) {
  if (!project) throw new Error('INVALID_PROJECT');
  project.execution = {
    ...(project.execution || {}),
    status: 'AI_READY',
    lastAIResult: result,
    lastAIAt: new Date().toISOString(),
    lastError: null,
  };
  project.updatedAt = new Date().toISOString();
  project.error = null;
  return project;
}

export function recordExecutionError(project, errorCode) {
  if (!project) throw new Error('INVALID_PROJECT');
  project.execution = {
    ...(project.execution || {}),
    status: 'ERROR',
    lastError: errorCode,
  };
  project.error = errorCode;
  project.updatedAt = new Date().toISOString();
  return project;
}

export function advanceProject(project, nextStage) {
  if (!project || !PROJECT_STAGES.includes(nextStage)) throw new Error('INVALID_STAGE');
  const current = PROJECT_STAGES.indexOf(project.stage);
  const next = PROJECT_STAGES.indexOf(nextStage);
  if (next < current) throw new Error('STAGE_REGRESSION');
  project.stage = nextStage;
  project.progress = Math.round((next / (PROJECT_STAGES.length - 1)) * 100);
  project.updatedAt = new Date().toISOString();
  project.error = null;
  project.execution = {
    ...(project.execution || {}),
    status: next === PROJECT_STAGES.length - 1 ? 'COMPLETED' : 'READY',
    lastError: null,
  };
  return project;
}
