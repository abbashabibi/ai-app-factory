import http from 'node:http';
import { issueLifetimeLicense, activateLicense, hashLicenseKey, publicLicense } from './license-service.mjs';
import { createProject, advanceProject } from './project-service.mjs';

const licenses = new Map();
const projects = new Map();

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
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
  return JSON.parse(raw);
}

function pathname(req) {
  return new URL(req.url || '/', 'http://localhost').pathname;
}

const server = http.createServer(async (req, res) => {
  const path = pathname(req);
  try {
    if (req.method === 'GET' && path === '/health') {
      return json(res, 200, { ok: true, service: 'ai-app-factory-backend', version: '0.1.0' });
    }

    if (req.method === 'POST' && path === '/api/v1/licenses/issue') {
      if (process.env.ADMIN_API_KEY && req.headers['x-admin-api-key'] !== process.env.ADMIN_API_KEY) {
        return json(res, 401, { error: 'UNAUTHORIZED' });
      }
      const body = await readBody(req);
      const license = issueLifetimeLicense(body);
      licenses.set(license.keyHash, license);
      return json(res, 201, { license: publicLicense(license), licenseKey: license.licenseKey });
    }

    if (req.method === 'POST' && path === '/api/v1/licenses/activate') {
      const body = await readBody(req);
      const license = licenses.get(hashLicenseKey(body.licenseKey));
      return json(res, 200, activateLicense(license, body));
    }

    if (req.method === 'POST' && path === '/api/v1/projects') {
      const body = await readBody(req);
      const project = createProject(body);
      projects.set(project.projectId, project);
      return json(res, 201, project);
    }

    const advanceMatch = path.match(/^\/api\/v1\/projects\/([^/]+)\/advance$/);
    if (req.method === 'POST' && advanceMatch) {
      const body = await readBody(req);
      const project = projects.get(advanceMatch[1]);
      const updated = advanceProject(project, body.stage);
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
    const known = new Set([
      'INVALID_LICENSE', 'INVALID_REQUEST', 'LICENSE_NOT_ACTIVE',
      'LICENSE_OWNERSHIP_MISMATCH', 'CHANNEL_LIMIT_EXCEEDED',
      'DEVICE_LIMIT_EXCEEDED', 'INVALID_STAGE', 'INVALID_PROJECT',
      'INVALID_PROJECT_NAME', 'PAYLOAD_TOO_LARGE', 'UNAUTHORIZED',
    ]);
    const status = error.message === 'UNAUTHORIZED' ? 401 : error.message === 'PAYLOAD_TOO_LARGE' ? 413 : known.has(error.message) ? 400 : 500;
    return json(res, status, { error: known.has(error.message) ? error.message : 'INTERNAL_ERROR' });
  }
});

const port = Number(process.env.PORT || 3000);
server.listen(port, () => console.log(`AI App Factory backend listening on ${port}`));
