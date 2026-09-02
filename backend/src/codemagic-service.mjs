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

export async function triggerCodemagicBuild({ appId = process.env.CODEMAGIC_APP_ID, workflowId = process.env.CODEMAGIC_WORKFLOW_ID || 'android-debug', branch = 'main', fetchImpl = fetch } = {}) {
  const token = requireConfig();
  if (!appId || !workflowId) throw new CodemagicError('CODEMAGIC_NOT_CONFIGURED', 'CODEMAGIC_NOT_CONFIGURED');
  const response = await fetchImpl(`${CODEMAGIC_API}/builds`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ appId, workflowId, branch }),
  });
  if (!response.ok) throw new CodemagicError(`CODEMAGIC_HTTP_${response.status}`);
  const data = await response.json();
  if (!data?.buildId) throw new CodemagicError('CODEMAGIC_BUILD_ID_MISSING');
  return { buildId: data.buildId, appId, workflowId, branch };
}

export async function getCodemagicBuildStatus(buildId, { fetchImpl = fetch } = {}) {
  if (!buildId) throw new CodemagicError('CODEMAGIC_BUILD_ID_MISSING', 'CODEMAGIC_BUILD_ID_MISSING');
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
