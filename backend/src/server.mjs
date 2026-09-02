import http from 'node:http';
import { issueLifetimeLicense, activateLicense, hashLicenseKey, publicLicense } from './license-service.mjs';

const licenses = new Map();

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') return json(res, 200, { ok: true, service: 'ai-app-factory-backend' });

    if (req.method === 'POST' && req.url === '/api/v1/licenses/issue') {
      const body = await readBody(req);
      const license = issueLifetimeLicense(body);
      licenses.set(license.keyHash, license);
      // The raw key is intentionally returned only at issuance time.
      return json(res, 201, { license: publicLicense(license), licenseKey: license.licenseKey });
    }

    if (req.method === 'POST' && req.url === '/api/v1/licenses/activate') {
      const body = await readBody(req);
      const license = licenses.get(hashLicenseKey(body.licenseKey));
      const activated = activateLicense(license, body);
      return json(res, 200, activated);
    }

    return json(res, 404, { error: 'NOT_FOUND' });
  } catch (error) {
    const known = new Set(['INVALID_LICENSE', 'INVALID_REQUEST', 'LICENSE_NOT_ACTIVE', 'LICENSE_OWNERSHIP_MISMATCH', 'CHANNEL_LIMIT_EXCEEDED', 'DEVICE_LIMIT_EXCEEDED']);
    const status = known.has(error.message) ? 400 : 500;
    return json(res, status, { error: known.has(error.message) ? error.message : 'INTERNAL_ERROR' });
  }
});

const port = Number(process.env.PORT || 3000);
server.listen(port, () => console.log(`AI App Factory backend listening on ${port}`));
