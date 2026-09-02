import { randomBytes } from 'node:crypto';

const CODEMAGIC_API = process.env.CODEMAGIC_API_URL || 'https://api.codemagic.io';

export class CodemagicError extends Error {
  constructor(message, code = 'CODEMAGIC_ERROR') {
    super(message);
    this.name = 'CodemagicError';
    this.code = code;
  }
}

function authHeaders(token) {
  return { 'x-auth-token': token, 'content-type': 'application/json' };
}

function requireConfig() {
  const token = process.env.CODEMAGIC_API_TOKEN;
  if (!token) throw new CodemagicError('CODEMAGIC_NOT_CONFIGURED', 'CODEMAGIC_NOT_CONFIGURED');
  return token;
}

export async function triggerCodemagicBuild({ appId = process.env.CODEMAGIC_APP_ID, workflowId = process.env.CODEMAGIC_WORKFLOW_ID || 'android-debug', branch = 'main', environment, labels, fetchImpl = fetch } = {}) {
  if (process.env.APP_FACTORY_E2E_MODE === '1') {
    return { buildId: `e2e-build-${randomBytes(8).toString('hex')}`, appId: appId || 'e2e-app', workflowId, branch, environment: environment || null, labels: labels || [], e2e: true };
  }
  const token = requireConfig();
  if (!appId || !workflowId) throw new CodemagicError('CODEMAGIC_NOT_CONFIGURED', 'CODEMAGIC_NOT_CONFIGURED');
  const body = { appId, workflowId, branch };
  if (environment) body.environment = environment;
  if (Array.isArray(labels) && labels.length) body.labels = labels;
  const response = await fetchImpl(`${CODEMAGIC_API}/builds`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new CodemagicError(`CODEMAGIC_HTTP_${response.status}`);
  const data = await response.json();
  if (!data?.buildId) throw new CodemagicError('CODEMAGIC_BUILD_ID_MISSING');
  return { buildId: data.buildId, appId, workflowId, branch, environment: environment || null, labels: labels || [] };
}

export async function getCodemagicBuildStatus(buildId, { fetchImpl = fetch } = {}) {
  if (!buildId) throw new CodemagicError('CODEMAGIC_BUILD_ID_MISSING', 'CODEMAGIC_BUILD_ID_MISSING');
  if (process.env.APP_FACTORY_E2E_MODE === '1') {
    return {
      buildId,
      status: 'finished',
      finished: true,
      failed: false,
      artifacts: [{ name: 'app-debug.apk', type: 'apk', url: `${CODEMAGIC_API}/artifacts/e2e-${buildId}/app-debug.apk` }],
      raw: { status: 'finished', e2e: true },
    };
  }
  const token = requireConfig();
  const response = await fetchImpl(`https://codemagic.io/api/v3/builds/${encodeURIComponent(buildId)}`, {
    method: 'GET',
    headers: authHeaders(token),
  });
  if (!response.ok) throw new CodemagicError(`CODEMAGIC_HTTP_${response.status}`);
  const data = await response.json();
  const build = data?.data;
  if (!build?.status) throw new CodemagicError('CODEMAGIC_STATUS_MISSING');
  return {
    buildId,
    status: build.status,
    finished: build.status === 'finished',
    failed: ['failed', 'canceled', 'timeout', 'skipped'].includes(build.status),
    artifacts: Array.isArray(build.artifacts) ? build.artifacts : [],
    raw: build,
  };
}

export async function createCodemagicPublicArtifactUrl(artifactUrl, { expiresAt, fetchImpl = fetch } = {}) {
  if (!artifactUrl || typeof artifactUrl !== 'string') throw new CodemagicError('CODEMAGIC_ARTIFACT_URL_MISSING', 'CODEMAGIC_ARTIFACT_URL_MISSING');
  const parsed = new URL(artifactUrl);
  const allowedHost = new URL(CODEMAGIC_API).host;
  if (parsed.host !== allowedHost || !parsed.pathname.startsWith('/artifacts/')) {
    throw new CodemagicError('CODEMAGIC_ARTIFACT_URL_INVALID', 'CODEMAGIC_ARTIFACT_URL_INVALID');
  }
  if (process.env.APP_FACTORY_E2E_MODE === '1') {
    return { url: `${CODEMAGIC_API}/artifacts/public/e2e-${randomBytes(10).toString('hex')}`, expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), e2e: true };
  }
  const token = requireConfig();
  const timestamp = Number(expiresAt || Math.floor(Date.now() / 1000) + 24 * 60 * 60);
  if (!Number.isFinite(timestamp) || timestamp <= Math.floor(Date.now() / 1000)) {
    throw new CodemagicError('CODEMAGIC_ARTIFACT_EXPIRY_INVALID', 'CODEMAGIC_ARTIFACT_EXPIRY_INVALID');
  }
  const response = await fetchImpl(`${artifactUrl.replace(/\/$/, '')}/public-url`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ expiresAt: Math.floor(timestamp) }),
  });
  if (!response.ok) throw new CodemagicError(`CODEMAGIC_HTTP_${response.status}`);
  const data = await response.json();
  if (!data?.url) throw new CodemagicError('CODEMAGIC_PUBLIC_URL_MISSING', 'CODEMAGIC_PUBLIC_URL_MISSING');
  return { url: data.url, expiresAt: data.expiresAt || new Date(Math.floor(timestamp) * 1000).toISOString() };
}
