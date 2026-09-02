import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const port = 39000 + Math.floor(Math.random() * 500);
const baseUrl = `http://127.0.0.1:${port}`;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
  });
  const body = await response.json();
  return { status: response.status, body };
}

async function waitForServer(child) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const result = await request('/health');
      if (result.status === 200 && result.body?.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  child.kill('SIGTERM');
  throw new Error('E2E_SERVER_START_TIMEOUT');
}

test('autonomous pipeline completes from idea to downloadable APK artifact', async () => {
  const child = spawn(process.execPath, ['src/server.mjs'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env, PORT: String(port), APP_FACTORY_E2E_MODE: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

  try {
    await waitForServer(child);

    const created = await request('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify({ accountId: 'e2e-account', title: 'E2E Test App', brief: 'Build a small Android test app.' }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.stage, 'IDEA');
    const projectId = created.body.projectId;

    const planned = await request(`/api/v1/projects/${projectId}/orchestrate/ai`, { method: 'POST', body: '{}' });
    assert.equal(planned.status, 200);
    assert.equal(planned.body.project.execution.status, 'AI_READY');

    for (const stage of ['RESEARCHED', 'SCRIPTED', 'ASSETS_READY']) {
      const advanced = await request(`/api/v1/projects/${projectId}/advance`, { method: 'POST', body: JSON.stringify({ stage }) });
      assert.equal(advanced.status, 200);
      assert.equal(advanced.body.stage, stage);
    }

    const generated = await request(`/api/v1/projects/${projectId}/source/generate`, { method: 'POST', body: '{}' });
    assert.equal(generated.status, 200);
    assert.ok(generated.body.source.files.length >= 5);

    const isolatedFiles = generated.body.source.files.map((file) => ({
      ...file,
      path: `generated/${projectId}/${file.path}`,
    }));
    const committed = await request(`/api/v1/projects/${projectId}/source/commit`, {
      method: 'POST',
      body: JSON.stringify({ repository: 'abbashabibi/ai-app-factory', files: isolatedFiles }),
    });
    assert.equal(committed.status, 201);
    assert.equal(committed.body.project.stage, 'RENDERED');
    assert.match(committed.body.source.commitSha, /^e2e_/);

    const qa = await request(`/api/v1/projects/${projectId}/qa/run`, {
      method: 'POST',
      body: JSON.stringify({ files: generated.body.source.files, commitSha: committed.body.source.commitSha }),
    });
    assert.equal(qa.status, 200);
    assert.equal(qa.body.qa.passed, true);
    assert.equal(qa.body.project.stage, 'QA_PASSED');

    const build = await request(`/api/v1/projects/${projectId}/build`, {
      method: 'POST',
      body: JSON.stringify({ appId: 'e2e-app', workflowId: 'android-debug', projectRoot: `generated/${projectId}` }),
    });
    assert.equal(build.status, 202);
    assert.match(build.body.build.buildId, /^e2e-build-/);

    const status = await request(`/api/v1/projects/${projectId}/build/${build.body.build.buildId}`);
    assert.equal(status.status, 200);
    assert.equal(status.body.build.finished, true);
    assert.equal(status.body.project.stage, 'UPLOADED');
    assert.equal(status.body.build.artifacts[0].name, 'app-debug.apk');

    const artifact = await request(`/api/v1/projects/${projectId}/build/${build.body.build.buildId}/artifact-url`, {
      method: 'POST',
      body: JSON.stringify({ artifactName: 'app-debug.apk' }),
    });
    assert.equal(artifact.status, 200);
    assert.match(artifact.body.url, /^https:\/\/api\.codemagic\.io\/artifacts\/public\//);

    const finalProject = await request(`/api/v1/projects/${projectId}`);
    assert.equal(finalProject.status, 200);
    assert.equal(finalProject.body.stage, 'UPLOADED');
  } finally {
    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('exit', resolve));
    if (stderr) process.stderr.write(stderr);
  }
});
