import http from 'node:http';
import { issueLifetimeLicense, activateLicense, hashLicenseKey, publicLicense } from './license-service.mjs';
import { createProject, advanceProject, recordAIResult, recordExecutionError } from './project-service.mjs';
import { createExecutionPlan, assertStageCompletion } from './orchestrator-service.mjs';
import { generateAIPlan } from './ai-provider.mjs';
import { triggerCodemagicBuild, getCodemagicBuildStatus, createCodemagicPublicArtifactUrl } from './codemagic-service.mjs';

const licenses = new Map();
const projects = new Map();

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': process.env.CORS_ORIGIN || '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,x-admin-api-key',
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

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const path = pathname(req);
  try {
    if (req.method === 'GET' && path === '/health') {
      return json(res, 200, { ok: true, service: 'ai-app-factory-backend', version: '0.7.0', orchestrator: true, aiProvider: Boolean(process.env.OPENAI_API_KEY), buildProvider: Boolean(process.env.CODEMAGIC_API_TOKEN && process.env.CODEMAGIC_APP_ID), sourceProvider: Boolean(process.env.GITHUB_TOKEN) });
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
    if (req.method === 'POST' && path === '/api/v1/projects') {
      const project = createProject(await readBody(req));
      projects.set(project.projectId, project);
      return json(res, 201, project);
    }
    const orchestrateMatch = path.match(/^\/api\/v1\/projects\/([^/]+)\/orchestrate$/);
    if (req.method === 'POST' && orchestrateMatch) {
      const project = projects.get(orchestrateMatch[1]);
      if (!project) return json(res, 404, { error: 'INVALID_PROJECT' });
      return json(res, 200, createExecutionPlan(project));
    }
    const aiMatch = path.match(/^\/api\/v1\/projects\/([^/]+)\/orchestrate\/ai$/);
    if (req.method === 'POST' && aiMatch) {
      const project = projects.get(aiMatch[1]);
      if (!project) return json(res, 404, { error: 'INVALID_PROJECT' });
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
    const buildMatch = path.match(/^\/api\/v1\/projects\/([^/]+)\/build$/);
    if (req.method === 'POST' && buildMatch) {
      const project = projects.get(buildMatch[1]);
      if (!project) return json(res, 404, { error: 'INVALID_PROJECT' });
      if (!['QA_PASSED', 'UPLOADED', 'ANALYZED'].includes(project.stage)) return json(res, 400, { error: 'BUILD_REQUIRES_QA' });
      const body = await readBody(req);
      const environment = body.projectRoot ? { variables: { PROJECT_ROOT: String(body.projectRoot) } } : undefined;
      const build = await triggerCodemagicBuild({
        appId: body.appId,
        workflowId: body.workflowId,
        branch: body.branch || 'main',
        environment,
        labels: ['ai-app-factory', project.projectId],
      });
      project.execution = { ...(project.execution || {}), build: { ...build, status: 'queued', finished: false, failed: false, artifacts: [] }, status: 'BUILD_QUEUED', lastError: null };
      project.updatedAt = new Date().toISOString();
      project.error = null;
      projects.set(project.projectId, project);
      return json(res, 202, { project, build: project.execution.build });
    }
    const buildStatusMatch = path.match(/^\/api\/v1\/projects\/([^/]+)\/build\/([^/]+)$/);
    if (req.method === 'GET' && buildStatusMatch) {
      const project = projects.get(buildStatusMatch[1]);
      if (!project) return json(res, 404, { error: 'INVALID_PROJECT' });
      const build = await getCodemagicBuildStatus(buildStatusMatch[2]);
      project.execution = { ...(project.execution || {}), build, status: build.finished ? 'BUILD_FINISHED' : build.failed ? 'BUILD_FAILED' : 'BUILD_RUNNING', lastError: build.failed ? build.status : null };
      if (build.finished && project.stage === 'QA_PASSED') {
        advanceProject(project, 'UPLOADED');
        project.execution.status = 'BUILD_FINISHED';
        project.execution.build = build;
      }
      if (build.failed) project.error = `BUILD_${String(build.status).toUpperCase()}`;
      else if (build.finished) project.error = null;
      project.updatedAt = new Date().toISOString();
      projects.set(project.projectId, project);
      return json(res, 200, { project, build });
    }
    const artifactUrlMatch = path.match(/^\/api\/v1\/projects\/([^/]+)\/build\/([^/]+)\/artifact-url$/);
    if (req.method === 'POST' && artifactUrlMatch) {
      const project = projects.get(artifactUrlMatch[1]);
      if (!project) return json(res, 404, { error: 'INVALID_PROJECT' });
      const currentBuild = project.execution?.build;
      if (!currentBuild || currentBuild.buildId !== artifactUrlMatch[2]) return json(res, 404, { error: 'CODEMAGIC_BUILD_ID_MISSING' });
      if (!currentBuild.finished) return json(res, 400, { error: 'BUILD_NOT_FINISHED' });
      const body = await readBody(req);
      const artifact = Array.isArray(currentBuild.artifacts) ? currentBuild.artifacts.find((item) => item?.url === body.artifactUrl || item?.name === body.artifactName) : null;
      const artifactUrl = artifact?.url || body.artifactUrl;
      if (!artifactUrl) return json(res, 400, { error: 'CODEMAGIC_ARTIFACT_URL_MISSING' });
      const publicUrl = await createCodemagicPublicArtifactUrl(artifactUrl, { expiresAt: body.expiresAt });
      return json(res, 200, publicUrl);
    }
    const completeMatch = path.match(/^\/api\/v1\/projects\/([^/]+)\/orchestrate\/complete$/);
    if (req.method === 'POST' && completeMatch) {
      const body = await readBody(req);
      const project = projects.get(completeMatch[1]);
      const completion = assertStageCompletion(project, body.stage);
      if (completion.nextStage) {
        const updated = advanceProject(project, completion.nextStage);
        projects.set(updated.projectId, updated);
        return json(res, 200, { project: updated, execution: createExecutionPlan(updated) });
      }
      return json(res, 200, { project, execution: createExecutionPlan(project) });
    }
    const advanceMatch = path.match(/^\/api\/v1\/projects\/([^/]+)\/advance$/);
    if (req.method === 'POST' && advanceMatch) {
      const updated = advanceProject(projects.get(advanceMatch[1]), (await readBody(req)).stage);
      projects.set(updated.projectId, updated);
      return json(res, 200, updated);
    }
    const projectMatch = path.match(/^\/api\/v1\/projects\/([^/]+)$/);
    if (req.method === 'GET' && projectMatch) {
      const project = projects.get(projectMatch[1]);
      if (!project) return json(res, 404, { error: 'INVALID_PROJECT' });
      return json(res, 200, project);
    }
    return json(res, 404, { error: 'NOT_FOUND' });
  } catch (error) {
    const known = new Set(['INVALID_LICENSE','INVALID_REQUEST','LICENSE_NOT_ACTIVE','LICENSE_OWNERSHIP_MISMATCH','CHANNEL_LIMIT_EXCEEDED','DEVICE_LIMIT_EXCEEDED','INVALID_STAGE','INVALID_PROJECT','INVALID_PROJECT_NAME','STAGE_REGRESSION','PAYLOAD_TOO_LARGE','UNAUTHORIZED','ORCHESTRATOR_STAGE_MISMATCH','AI_PROVIDER_NOT_CONFIGURED','AI_PROVIDER_ERROR','AI_EMPTY_RESPONSE','AI_INVALID_JSON','AI_TIMEOUT','AI_NETWORK_ERROR','CODEMAGIC_NOT_CONFIGURED','CODEMAGIC_BUILD_ID_MISSING','CODEMAGIC_STATUS_MISSING','CODEMAGIC_ARTIFACT_URL_MISSING','CODEMAGIC_ARTIFACT_URL_INVALID','CODEMAGIC_ARTIFACT_EXPIRY_INVALID','CODEMAGIC_PUBLIC_URL_MISSING','BUILD_REQUIRES_QA','BUILD_NOT_FINISHED']);
    const code = error.code || error.message;
    const status = code === 'UNAUTHORIZED' ? 401 : code === 'PAYLOAD_TOO_LARGE' ? 413 : known.has(code) ? 400 : 500;
    return json(res, status, { error: known.has(code) ? code : 'INTERNAL_ERROR' });
  }
});

const port = Number(process.env.PORT || 3000);
server.listen(port, () => console.log(`AI App Factory backend listening on ${port}`));
