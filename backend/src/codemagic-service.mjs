const CODEMAGIC_API = process.env.CODEMAGIC_API_URL || 'https://api.codemagic.io';

export class CodemagicError extends Error {
  constructor(message, code = 'CODEMAGIC_ERROR') {
    super(message);
    this.name = 'CodemagicError';
    this.code = code;
  }
}

export async function triggerCodemagicBuild({ appId = process.env.CODEMAGIC_APP_ID, workflowId = process.env.CODEMAGIC_WORKFLOW_ID || 'android-debug', branch = 'main', fetchImpl = fetch } = {}) {
  const token = process.env.CODEMAGIC_API_TOKEN;
  if (!token || !appId || !workflowId) throw new CodemagicError('CODEMAGIC_NOT_CONFIGURED', 'CODEMAGIC_NOT_CONFIGURED');
  const response = await fetchImpl(`${CODEMAGIC_API}/builds`, {
    method: 'POST',
    headers: { 'x-auth-token': token, 'content-type': 'application/json' },
    body: JSON.stringify({ appId, workflowId, branch }),
  });
  if (!response.ok) throw new CodemagicError(`CODEMAGIC_HTTP_${response.status}`);
  const data = await response.json();
  if (!data?.buildId) throw new CodemagicError('CODEMAGIC_BUILD_ID_MISSING');
  return { buildId: data.buildId, appId, workflowId, branch };
}
