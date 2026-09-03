import http from 'node:http';
import { issueLifetimeLicense, activateLicense, hashLicenseKey, publicLicense } from './license-service.mjs';
import { createProject, advanceProject, recordAIResult, recordExecutionError } from './project-service.mjs';
import { createExecutionPlan, assertStageCompletion } from './orchestrator-service.mjs';
import { generateAIPlan } from './ai-provider.mjs';
import { generateSource } from './source-generator.mjs';
import { runSourceQA } from './qa-service.mjs';
import { triggerCodemagicBuild, getCodemagicBuildStatus, createCodemagicPublicArtifactUrl } from './codemagic-service.mjs';
import { commitFiles } from './github-service.mjs';
import { createAccountRecord, hashPassword, normalizeEmail, publicAccount, signSession, verifyPassword, verifySession } from './auth-service.mjs';
import { createPersistentProjectMap, hydrateProjects, initStorage, saveAccount, findAccountByEmail, findAccountById, storageMode, saveJob, findJobById, listJobs } from './storage-service.mjs';
import { createJob, startJob, updateJobStage, finishJob } from './job-service.mjs';

const licenses = new Map();
const projects = createPersistentProjectMap();

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': process.env.CORS_ORIGIN || '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,x-admin-api-key',
  });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1024 * 1024) throw new Error('PAYLOAD_TOO_LARGE');
  }
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw new Error('INVALID_REQUEST'); }
}

function pathname(req) { return new URL(req.url || '/', 'http://localhost').pathname; }
function bearer(req) { const value = req.headers.authorization || ''; return value.startsWith('Bearer ') ? value.slice(7) : null; }
async function authenticatedAccount(req) {
  const session = verifySession(bearer(req));
  if (!session) return null;
  const account = await findAccountById(session.accountId);
  return account?.status === 'ACTIVE' ? account : null;
}

async function authorizedProject(req, projectId) {
  const project = projects.get(projectId);
  if (!project) return { error: 'INVALID_PROJECT' };
  const account = await authenticatedAccount(req);
  if (process.env.AUTH_REQUIRED === 'true' && !account) return { error: 'UNAUTHORIZED' };
  if (account && project.accountId !== account.accountId) return { error: 'FORBIDDEN' };
  return { project, account };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const path = pathname(req);
  try {
    if (req.method === 'GET' && path === '/health') {
      return json(res, 200, { ok: true, service: 'ai-app-factory-backend', version: '1.1.0', orchestrator: true, aiProvider: Boolean(process.env.OPENAI_API_KEY), buildProvider: Boolean(process.env.CODEMAGIC_API_TOKEN && process.env.CODEMAGIC_APP_ID), sourceProvider: Boolean(process.env.GITHUB_TOKEN), qaProvider: true, storage: storageMode(), auth: true });
    }
    if (req.method === 'POST' && path === '/api/v1/auth/register') {
      const body = await readBody(req);
      const email = normalizeEmail(body.email);
      if (await findAccountByEmail(email)) return json(res, 409, { error: 'EMAIL_ALREADY_REGISTERED' });
      const passwordHash = await hashPassword(body.password);
      const account = createAccountRecord({ email, passwordHash, name: body.name });
      await saveAccount(account);
      const token = signSession(account.accountId);
      return json(res, 201, { account: publicAccount(account), token });
    }
    if (req.method === 'POST' && path === '/api/v1/auth/login') {
      const body = await readBody(req);
      const account = await findAccountByEmail(normalizeEmail(body.email));
      if (!account || account.status !== 'ACTIVE' || !(await verifyPassword(body.password, account.passwordHash))) return json(res, 401, { error: 'INVALID_CREDENTIALS' });
      return json(res, 200, { account: publicAccount(account), token: signSession(account.accountId) });
    }
    if (req.method === 'GET' && path === '/api/v1/auth/me') {
      const account = await authenticatedAccount(req);
      if (!account) return json(res, 401, { error: 'UNAUTHORIZED' });
      return json(res, 200, { account: publicAccount(account) });
    }
    if (req.method === 'POST' && path === '/api/v1/licenses/issue') {
      if (process.env.ADMIN_API_KEY && req.headers['x-admin-api-key'] !== process.env.ADMIN_API_KEY) return json(res, 401, { error: 'UNAUTHORIZED' });
      const license = issueLifetimeLicense(await readBody(req));
      licenses.set(license.keyHash, license);
      return json(res, 201, { license: publicLicense(license), licenseKey: license.licenseKey });
    }
    if (req.method === 'POST' && path === '/api/v1/licenses/activate') {
      const body = await readBody(req);
      return json(res, 200, activateLicense(licenses.get(hashLicenseKey(body.licenseKey)), body));
    }
    if (req.method === 'POST' && path === '/api/v1/jobs') { const account=await authenticatedAccount(req); if(!account&&process.env.AUTH_REQUIRED==='true')return json(res,401,{error:'UNAUTHORIZED'}); const body=await readBody(req); const project=projects.get(body.projectId); if(!project)return json(res,404,{error:'INVALID_PROJECT'}); if(account&&project.accountId!==account.accountId)return json(res,403,{error:'FORBIDDEN'}); const job=createJob({projectId:project.projectId,accountId:project.accountId,kind:body.kind||'factory'}); await saveJob(job); return json(res,201,job); }
    const jobMatch=path.match(/^\/api\/v1\/jobs\/([^/]+)$/); if(req.method==='GET'&&jobMatch){const job=await findJobById(jobMatch[1]);if(!job)return json(res,404,{error:'INVALID_JOB'});const account=await authenticatedAccount(req);if(!account&&process.env.AUTH_REQUIRED==='true')return json(res,401,{error:'UNAUTHORIZED'});if(account&&job.accountId!==account.accountId)return json(res,403,{error:'FORBIDDEN'});return json(res,200,job);}
    if(req.method==='GET'&&path==='/api/v1/jobs'){const account=await authenticatedAccount(req);if(!account&&process.env.AUTH_REQUIRED==='true')return json(res,401,{error:'UNAUTHORIZED'});return json(res,200,await listJobs(account?.accountId||'demo-account'));}
    const jobStart=path.match(/^\/api\/v1\/jobs\/([^/]+)\/start$/); if(req.method==='POST'&&jobStart){const job=await findJobById(jobStart[1]);if(!job)return json(res,404,{error:'INVALID_JOB'});const account=await authenticatedAccount(req);if(!account&&process.env.AUTH_REQUIRED==='true')return json(res,401,{error:'UNAUTHORIZED'});if(account&&job.accountId!==account.accountId)return json(res,403,{error:'FORBIDDEN'});startJob(job);await saveJob(job);return json(res,200,job);}
    const jobStage=path.match(/^\/api\/v1\/jobs\/([^/]+)\/stage$/); if(req.method==='POST'&&jobStage){const job=await findJobById(jobStage[1]);if(!job)return json(res,404,{error:'INVALID_JOB'});const account=await authenticatedAccount(req);if(!account&&process.env.AUTH_REQUIRED==='true')return json(res,401,{error:'UNAUTHORIZED'});if(account&&job.accountId!==account.accountId)return json(res,403,{error:'FORBIDDEN'});updateJobStage(job,(await readBody(req)).stage);await saveJob(job);return json(res,200,job);}
    const jobFinish=path.match(/^\/api\/v1\/jobs\/([^/]+)\/finish$/); if(req.method==='POST'&&jobFinish){const job=await findJobById(jobFinish[1]);if(!job)return json(res,404,{error:'INVALID_JOB'});const account=await authenticatedAccount(req);if(!account&&process.env.AUTH_REQUIRED==='true')return json(res,401,{error:'UNAUTHORIZED'});if(account&&job.accountId!==account.accountId)return json(res,403,{error:'FORBIDDEN'});const body=await readBody(req);finishJob(job,body.state,body.error||null);await saveJob(job);return json(res,200,job);}
    if (req.method === 'POST' && path === '/api/v1/projects') {
      const body = await readBody(req);
      const account = await authenticatedAccount(req);
      if (!account && process.env.AUTH_REQUIRED === 'true') return json(res, 401, { error: 'UNAUTHORIZED' });
      const project = createProject({ ...body, accountId: account?.accountId || body.accountId || 'demo-account' });
      projects.set(project.projectId, project);
      return json(res, 201, project);
    }
    const orchestrateMatch = path.match(/^\/api\/v1\/projects\/([^/]+)\/orchestrate$/);
    if (req.method === 'POST' && orchestrateMatch) {
      const access = await authorizedProject(req, orchestrateMatch[1]);
      if (access.error) return json(res, access.error === 'INVALID_PROJECT' ? 404 : 403, { error: access.error });
      const project = access.project;
      return json(res, 200, createExecutionPlan(project));
    }
    const aiMatch = path.match(/^\/api\/v1\/projects\/([^/]+)\/orchestrate\/ai$/);
    if (req.method === 'POST' && aiMatch) {
      const access = await authorizedProject(req, aiMatch[1]);
      if (access.error) return json(res, access.error === 'INVALID_PROJECT' ? 404 : 403, { error: access.error });
      const project = access.project;
      try {
        const result = await generateAIPlan({ title: project.title, brief: project.brief, stage: project.stage });
        const updated = recordAIResult(project, result);
        projects.set(updated.projectId, updated);
        return json(res, 200, { project: updated, stage: updated.stage, result });
      } catch (error) {
        const updated = recordExecutionError(project, error.code || error.message || 'AI_PROVIDER_ERROR');
        projects.set(updated.projectId, updated);
        throw error;
      }
    }
    const sourceGenerateMatch = path.match(/^\/api\/v1\/projects\/([^/]+)\/source\/generate$/);
    if (req.method === 'POST' && sourceGenerateMatch) {
      const access = await authorizedProject(req, sourceGenerateMatch[1]);
      if (access.error) return json(res, access.error === 'INVALID_PROJECT' ? 404 : 403, { error: access.error });
      const project = access.project;
      if (project.stage !== 'ASSETS_READY') return json(res, 400, { error: 'SOURCE_REQUIRES_UI_SPEC' });
      try {
        const result = await generateSource({ title: project.title, brief: project.brief, plan: project.execution?.lastAIResult || {} });
        project.execution = { ...(project.execution || {}), sourceDraft: result, status: 'SOURCE_READY', lastError: null };
        project.updatedAt = new Date().toISOString(); project.error = null;
        projects.set(project.projectId, project);
        return json(res, 200, { project, source: result });
      } catch (error) {
        const updated = recordExecutionError(project, error.code || error.message || 'SOURCE_GENERATION_ERROR');
        projects.set(updated.projectId, updated); throw error;
      }
    }
    const sourceCommitMatch = path.match(/^\/api\/v1\/projects\/([^/]+)\/source\/commit$/);
    if (req.method === 'POST' && sourceCommitMatch) {
      const access = await authorizedProject(req, sourceCommitMatch[1]);
      if (access.error) return json(res, access.error === 'INVALID_PROJECT' ? 404 : 403, { error: access.error });
      const project = access.project;
      if (project.stage !== 'ASSETS_READY') return json(res, 400, { error: 'SOURCE_REQUIRES_UI_SPEC' });
      const body = await readBody(req); const repository = process.env.GITHUB_REPOSITORY || body.repository; const files = body.files || project.execution?.sourceDraft?.files;
      if (!repository || (process.env.GITHUB_REPOSITORY && body.repository && body.repository !== process.env.GITHUB_REPOSITORY)) return json(res, 400, { error: 'GITHUB_REPOSITORY_NOT_ALLOWED' });
      if (!Array.isArray(files) || files.length > 50) return json(res, 400, { error: 'GITHUB_FILES_MISSING' });
      const result = await commitFiles({ repository, branch: body.branch || 'main', message: body.message || `feat: generate source for ${project.projectId}`, files });
      project.execution = { ...(project.execution || {}), source: result, status: 'SOURCE_COMMITTED', lastError: null }; advanceProject(project, 'RENDERED'); project.execution.status = 'SOURCE_COMMITTED'; projects.set(project.projectId, project);
      return json(res, 201, { project, source: result });
    }
    const qaMatch = path.match(/^\/api\/v1\/projects\/([^/]+)\/qa\/run$/);
    if (req.method === 'POST' && qaMatch) {
      const access = await authorizedProject(req, qaMatch[1]); if (access.error) return json(res, access.error === 'INVALID_PROJECT' ? 404 : 403, { error: access.error });
      const project = access.project;
      if (project.stage !== 'RENDERED') return json(res, 400, { error: 'QA_REQUIRES_SOURCE' });
      const body = await readBody(req); const files = body.files || project.execution?.sourceDraft?.files; const commitSha = body.commitSha || project.execution?.source?.commitSha; const result = runSourceQA({ files, commitSha });
      project.execution = { ...(project.execution || {}), qa: result, status: result.passed ? 'QA_PASSED' : 'QA_FAILED', lastError: result.passed ? null : 'QA_FAILED' }; project.updatedAt = new Date().toISOString(); project.error = result.passed ? null : 'QA_FAILED'; if (result.passed) advanceProject(project, 'QA_PASSED'); projects.set(project.projectId, project);
      return json(res, result.passed ? 200 : 422, { project, qa: result });
    }
    const buildMatch = path.match(/^\/api\/v1\/projects\/([^/]+)\/build$/);
    if (req.method === 'POST' && buildMatch) {
      const access = await authorizedProject(req, buildMatch[1]); if (access.error) return json(res, access.error === 'INVALID_PROJECT' ? 404 : 403, { error: access.error });
      const project = access.project;
      if (!['QA_PASSED', 'UPLOADED', 'ANALYZED'].includes(project.stage)) return json(res, 400, { error: 'BUILD_REQUIRES_QA' });
      const body = await readBody(req); const environment = body.projectRoot ? { variables: { PROJECT_ROOT: String(body.projectRoot) } } : undefined;
      const build = await triggerCodemagicBuild({ appId: body.appId, workflowId: body.workflowId, branch: body.branch || 'main', environment, labels: ['ai-app-factory', project.projectId] });
      project.execution = { ...(project.execution || {}), build: { ...build, status: 'queued', finished: false, failed: false, artifacts: [] }, status: 'BUILD_QUEUED', lastError: null }; project.updatedAt = new Date().toISOString(); project.error = null; projects.set(project.projectId, project);
      return json(res, 202, { project, build: project.execution.build });
    }
    const buildStatusMatch = path.match(/^\/api\/v1\/projects\/([^/]+)\/build\/([^/]+)$/);
    if (req.method === 'GET' && buildStatusMatch) {
      const access = await authorizedProject(req, buildStatusMatch[1]); if (access.error) return json(res, access.error === 'INVALID_PROJECT' ? 404 : 403, { error: access.error });
      const project = access.project;
      const build = await getCodemagicBuildStatus(buildStatusMatch[2]); project.execution = { ...(project.execution || {}), build, status: build.finished ? 'BUILD_FINISHED' : build.failed ? 'BUILD_FAILED' : 'BUILD_RUNNING', lastError: build.failed ? build.status : null };
      if (build.finished && project.stage === 'QA_PASSED') { advanceProject(project, 'UPLOADED'); project.execution.status = 'BUILD_FINISHED'; project.execution.build = build; }
      if (build.failed) project.error = `BUILD_${String(build.status).toUpperCase()}`; else if (build.finished) project.error = null; project.updatedAt = new Date().toISOString(); projects.set(project.projectId, project);
      return json(res, 200, { project, build });
    }
    const artifactUrlMatch = path.match(/^\/api\/v1\/projects\/([^/]+)\/build\/([^/]+)\/artifact-url$/);
    if (req.method === 'POST' && artifactUrlMatch) {
      const access = await authorizedProject(req, artifactUrlMatch[1]); if (access.error) return json(res, access.error === 'INVALID_PROJECT' ? 404 : 403, { error: access.error });
      const project = access.project; const currentBuild = project.execution?.build;
      if (!currentBuild || currentBuild.buildId !== artifactUrlMatch[2]) return json(res, 404, { error: 'CODEMAGIC_BUILD_ID_MISSING' }); if (!currentBuild.finished) return json(res, 400, { error: 'BUILD_NOT_FINISHED' });
      const body = await readBody(req); const artifact = Array.isArray(currentBuild.artifacts) ? currentBuild.artifacts.find((item) => item?.url === body.artifactUrl || item?.name === body.artifactName) : null; const artifactUrl = artifact?.url || body.artifactUrl;
      if (!artifactUrl) return json(res, 400, { error: 'CODEMAGIC_ARTIFACT_URL_MISSING' }); return json(res, 200, await createCodemagicPublicArtifactUrl(artifactUrl, { expiresAt: body.expiresAt }));
    }
    const completeMatch = path.match(/^\/api\/v1\/projects\/([^/]+)\/orchestrate\/complete$/);
    if (req.method === 'POST' && completeMatch) {
      const body = await readBody(req); const access = await authorizedProject(req, completeMatch[1]); if (access.error) return json(res, access.error === 'INVALID_PROJECT' ? 404 : 403, { error: access.error }); const project = access.project; const completion = assertStageCompletion(project, body.stage);
      if (completion.nextStage) { const updated = advanceProject(project, completion.nextStage); projects.set(updated.projectId, updated); return json(res, 200, { project: updated, execution: createExecutionPlan(updated) }); }
      return json(res, 200, { project, execution: createExecutionPlan(project) });
    }
    const advanceMatch = path.match(/^\/api\/v1\/projects\/([^/]+)\/advance$/);
    if (req.method === 'POST' && advanceMatch) { const access = await authorizedProject(req, advanceMatch[1]); if (access.error) return json(res, access.error === 'INVALID_PROJECT' ? 404 : 403, { error: access.error }); const updated = advanceProject(access.project, (await readBody(req)).stage); projects.set(updated.projectId, updated); return json(res, 200, updated); }
    const projectMatch = path.match(/^\/api\/v1\/projects\/([^/]+)$/);
    if (req.method === 'GET' && path === '/api/v1/projects') {
      const account = await authenticatedAccount(req);
      if (!account && process.env.AUTH_REQUIRED === 'true') return json(res, 401, { error: 'UNAUTHORIZED' });
      const items = [...projects.values()].filter((project) => !account || project.accountId === account.accountId);
      return json(res, 200, { projects: items });
    }
    if (req.method === 'GET' && projectMatch) {
      const access = await authorizedProject(req, projectMatch[1]); if (access.error) return json(res, access.error === 'INVALID_PROJECT' ? 404 : 403, { error: access.error }); return json(res, 200, access.project);
    }
    return json(res, 404, { error: 'NOT_FOUND' });
  } catch (error) {
    const known = new Set(['INVALID_LICENSE','INVALID_REQUEST','LICENSE_NOT_ACTIVE','LICENSE_OWNERSHIP_MISMATCH','CHANNEL_LIMIT_EXCEEDED','DEVICE_LIMIT_EXCEEDED','INVALID_STAGE','INVALID_PROJECT','INVALID_PROJECT_NAME','STAGE_REGRESSION','PAYLOAD_TOO_LARGE','UNAUTHORIZED','FORBIDDEN','ORCHESTRATOR_STAGE_MISMATCH','AI_PROVIDER_NOT_CONFIGURED','AI_PROVIDER_ERROR','AI_EMPTY_RESPONSE','AI_INVALID_JSON','AI_TIMEOUT','AI_NETWORK_ERROR','CODEMAGIC_NOT_CONFIGURED','CODEMAGIC_BUILD_ID_MISSING','CODEMAGIC_STATUS_MISSING','CODEMAGIC_ARTIFACT_URL_MISSING','CODEMAGIC_ARTIFACT_URL_INVALID','CODEMAGIC_ARTIFACT_EXPIRY_INVALID','CODEMAGIC_PUBLIC_URL_MISSING','BUILD_REQUIRES_QA','BUILD_NOT_FINISHED','GITHUB_NOT_CONFIGURED','GITHUB_INVALID_REPOSITORY','GITHUB_COMMIT_MESSAGE_MISSING','GITHUB_FILES_MISSING','GITHUB_FILE_CONTENT_MISSING','GITHUB_INVALID_FILE_PATH','GITHUB_PARENT_SHA_MISSING','GITHUB_BASE_TREE_MISSING','GITHUB_BLOB_SHA_MISSING','GITHUB_TREE_SHA_MISSING','GITHUB_COMMIT_SHA_MISSING','GITHUB_REF_UPDATE_FAILED','GITHUB_REPOSITORY_NOT_ALLOWED','SOURCE_REQUIRES_UI_SPEC','SOURCE_INVALID_MANIFEST','SOURCE_FILE_COUNT_INVALID','SOURCE_DUPLICATE_PATH','SOURCE_INVALID_FILE_PATH','SOURCE_FILE_CONTENT_MISSING','SOURCE_FILE_TOO_LARGE','SOURCE_TOTAL_SIZE_TOO_LARGE','SOURCE_GENERATION_ERROR','QA_FILES_MISSING','QA_TOO_MANY_FILES','QA_COMMIT_MISSING','QA_FAILED','QA_REQUIRES_SOURCE','QA_FILE_TOO_LARGE','QA_TOTAL_SIZE_TOO_LARGE','EMAIL_ALREADY_REGISTERED','INVALID_CREDENTIALS','EMAIL_INVALID','PASSWORD_INVALID','PASSWORD_HASH_MISSING','SESSION_SECRET_NOT_CONFIGURED']);
    const code = error.code || error.message; const status = code === 'UNAUTHORIZED' || code === 'INVALID_CREDENTIALS' ? 401 : code === 'EMAIL_ALREADY_REGISTERED' ? 409 : code === 'PAYLOAD_TOO_LARGE' ? 413 : known.has(code) ? 400 : 500;
    return json(res, status, { error: known.has(code) ? code : 'INTERNAL_ERROR' });
  }
});

const port = Number(process.env.PORT || 3000);
await initStorage();
await hydrateProjects(projects);
server.listen(port, () => console.log(`AI App Factory backend listening on ${port} (${storageMode()})`));
