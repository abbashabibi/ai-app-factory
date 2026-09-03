import { findProjectById, saveProject, claimNextQueuedJob, saveJob } from './storage-service.mjs';
import { startJob, updateJobStage, finishJob } from './job-service.mjs';
import { generateAIPlan } from './ai-provider.mjs';
import { generateSource } from './source-generator.mjs';
import { runSourceQA } from './qa-service.mjs';
import { commitFiles } from './github-service.mjs';
import { triggerCodemagicBuild } from './codemagic-service.mjs';
import { advanceProject, recordAIResult, recordExecutionError } from './project-service.mjs';

const POLL_MS = Math.max(1000, Number(process.env.JOB_WORKER_POLL_MS || 5000));
const MAX_BUILD_WAIT_MS = Math.max(60000, Number(process.env.JOB_MAX_BUILD_WAIT_MS || 1800000));

function prefixedFiles(files, prefix) {
  return files.map((file) => ({ ...file, path: `${prefix}/${file.path.replace(/^\/+/, '')}` }));
}

async function persistFailure(job, project, error) {
  const code = error?.code || error?.message || 'FACTORY_JOB_FAILED';
  if (project) {
    recordExecutionError(project, code);
    await saveProject(project);
  }
  job.metadata = { ...(job.metadata || {}), lastError: code };
  finishJob(job, 'FAILED', code);
  await saveJob(job);
}

async function waitForBuild(buildId) {
  const started = Date.now();
  let last;
  while (Date.now() - started < MAX_BUILD_WAIT_MS) {
    last = await (await import('./codemagic-service.mjs')).getCodemagicBuildStatus(buildId);
    if (last.finished || last.failed) return last;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  const error = new Error('CODEMAGIC_BUILD_TIMEOUT');
  error.code = 'CODEMAGIC_BUILD_TIMEOUT';
  throw error;
}

export async function executeFactoryJob(job) {
  const project = await findProjectById(job.projectId);
  if (!project) throw Object.assign(new Error('INVALID_PROJECT'), { code: 'INVALID_PROJECT' });

  startJob(job);
  await saveJob(job);

  try {
    if (project.stage === 'IDEA') {
      const result = await generateAIPlan({ title: project.title, brief: project.brief, stage: project.stage });
      recordAIResult(project, result);
      advanceProject(project, 'RESEARCHED');
      await saveProject(project);
      updateJobStage(job, 'RESEARCHED');
      await saveJob(job);
    }

    if (project.stage === 'RESEARCHED') {
      advanceProject(project, 'SCRIPTED');
      await saveProject(project);
      updateJobStage(job, 'SCRIPTED');
      await saveJob(job);
    }

    if (project.stage === 'SCRIPTED') {
      advanceProject(project, 'ASSETS_READY');
      await saveProject(project);
      updateJobStage(job, 'ASSETS_READY');
      await saveJob(job);
    }

    if (project.stage === 'ASSETS_READY') {
      const source = await generateSource({ title: project.title, brief: project.brief, plan: project.execution?.lastAIResult || {} });
      project.execution = { ...(project.execution || {}), sourceDraft: source, status: 'SOURCE_READY', lastError: null };
      await saveProject(project);

      const repository = process.env.GITHUB_REPOSITORY;
      if (!repository) throw Object.assign(new Error('GITHUB_REPOSITORY_NOT_CONFIGURED'), { code: 'GITHUB_REPOSITORY_NOT_CONFIGURED' });
      const prefix = `generated/${project.projectId}`;
      const commit = await commitFiles({
        repository,
        branch: process.env.GITHUB_BRANCH || 'main',
        message: `feat: generate factory project ${project.projectId}`,
        files: prefixedFiles(source.files, prefix),
      });
      project.execution = { ...(project.execution || {}), source: commit, status: 'SOURCE_COMMITTED', lastError: null };
      advanceProject(project, 'RENDERED');
      await saveProject(project);
      updateJobStage(job, 'RENDERED');
      await saveJob(job);
    }

    if (project.stage === 'RENDERED') {
      const sourceFiles = project.execution?.sourceDraft?.files;
      const commitSha = project.execution?.source?.commitSha;
      const qa = runSourceQA({ files: sourceFiles, commitSha });
      project.execution = { ...(project.execution || {}), qa, status: qa.passed ? 'QA_PASSED' : 'QA_FAILED' };
      if (!qa.passed) throw Object.assign(new Error('QA_FAILED'), { code: 'QA_FAILED' });
      advanceProject(project, 'QA_PASSED');
      await saveProject(project);
      updateJobStage(job, 'QA_PASSED');
      await saveJob(job);
    }

    if (project.stage === 'QA_PASSED') {
      const build = await triggerCodemagicBuild({
        appId: process.env.CODEMAGIC_APP_ID,
        workflowId: process.env.CODEMAGIC_WORKFLOW_ID || 'android-debug',
        branch: process.env.GITHUB_BRANCH || 'main',
        environment: { variables: { PROJECT_ROOT: `generated/${project.projectId}` } },
        labels: ['ai-app-factory', project.projectId],
      });
      project.execution = { ...(project.execution || {}), build: { ...build, status: 'queued' }, status: 'BUILD_QUEUED', lastError: null };
      await saveProject(project);

      const status = await waitForBuild(build.buildId);
      project.execution.build = { ...project.execution.build, ...status };
      if (status.failed) throw Object.assign(new Error('CODEMAGIC_BUILD_FAILED'), { code: 'CODEMAGIC_BUILD_FAILED' });
      advanceProject(project, 'UPLOADED');
      await saveProject(project);
      updateJobStage(job, 'UPLOADED');
      await saveJob(job);
    }

    if (project.stage === 'UPLOADED') {
      advanceProject(project, 'ANALYZED');
      await saveProject(project);
      updateJobStage(job, 'ANALYZED');
      await saveJob(job);
    }

    finishJob(job, 'SUCCEEDED');
    await saveJob(job);
    return job;
  } catch (error) {
    await persistFailure(job, project, error);
    throw error;
  }
}

let running = false;
export function startFactoryWorker() {
  if (running) return;
  running = true;
  const tick = async () => {
    if (!running) return;
    try {
      const job = await claimNextQueuedJob();
      if (job) await executeFactoryJob(job);
    } catch (error) {
      console.error('FACTORY_WORKER_ERROR', error?.code || error?.message || error);
    } finally {
      setTimeout(tick, POLL_MS);
    }
  };
  void tick();
}
