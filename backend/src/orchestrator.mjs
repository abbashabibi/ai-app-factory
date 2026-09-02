import { PROJECT_STAGES } from './project-service.mjs';

export const STAGE_TASKS = Object.freeze({
  IDEA: 'Turn the user idea into a precise product brief and scope.',
  RESEARCHED: 'Research requirements, constraints, risks, users, and technical dependencies.',
  SCRIPTED: 'Produce the technical architecture, data model, APIs, and implementation plan.',
  ASSETS_READY: 'Define the UI/UX system, screens, states, and reusable components.',
  RENDERED: 'Generate implementation-ready source code and configuration.',
  QA_PASSED: 'Run tests, static checks, security checks, and acceptance validation.',
  UPLOADED: 'Trigger the configured cloud build and collect verified artifacts.',
  ANALYZED: 'Verify delivery artifacts and produce the final handoff report.'
});

export function createExecutionPlan(project) {
  if (!project?.projectId) throw new Error('INVALID_PROJECT');
  return PROJECT_STAGES.map((stage, index) => ({
    stage,
    order: index + 1,
    task: STAGE_TASKS[stage],
    status: index === 0 ? 'READY' : 'WAITING',
    requiresProvider: ['RENDERED', 'UPLOADED'].includes(stage)
  }));
}

export function nextStage(project) {
  const index = PROJECT_STAGES.indexOf(project?.stage);
  if (index < 0) throw new Error('INVALID_STAGE');
  return PROJECT_STAGES[index + 1] ?? null;
}

export function stagePlan(project, stage = project.stage) {
  const plan = createExecutionPlan(project);
  const item = plan.find((entry) => entry.stage === stage);
  if (!item) throw new Error('INVALID_STAGE');
  return item;
}
