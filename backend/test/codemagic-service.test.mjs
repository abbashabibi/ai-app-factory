import test from 'node:test';
import assert from 'node:assert/strict';
import { triggerCodemagicBuild, getCodemagicBuildStatus, CodemagicError } from '../src/codemagic-service.mjs';

test('Codemagic provider rejects missing configuration without a network call', async () => {
  const oldToken = process.env.CODEMAGIC_API_TOKEN;
  const oldApp = process.env.CODEMAGIC_APP_ID;
  delete process.env.CODEMAGIC_API_TOKEN;
  delete process.env.CODEMAGIC_APP_ID;
  await assert.rejects(
    () => triggerCodemagicBuild({ fetchImpl: async () => { throw new Error('NETWORK_CALLED'); } }),
    (error) => error instanceof CodemagicError && error.code === 'CODEMAGIC_NOT_CONFIGURED'
  );
  if (oldToken) process.env.CODEMAGIC_API_TOKEN = oldToken;
  if (oldApp) process.env.CODEMAGIC_APP_ID = oldApp;
});

test('Codemagic provider sends the documented build request and returns buildId', async () => {
  process.env.CODEMAGIC_API_TOKEN = 'cm-test';
  const result = await triggerCodemagicBuild({
    appId: 'app-1', workflowId: 'android-debug', branch: 'main',
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://api.codemagic.io/builds');
      assert.equal(options.headers['x-auth-token'], 'cm-test');
      assert.deepEqual(JSON.parse(options.body), { appId: 'app-1', workflowId: 'android-debug', branch: 'main' });
      return { ok: true, json: async () => ({ buildId: 'build-123' }) };
    }
  });
  assert.equal(result.buildId, 'build-123');
  delete process.env.CODEMAGIC_API_TOKEN;
});

test('Codemagic status reads v3 data.status and classifies terminal states', async () => {
  process.env.CODEMAGIC_API_TOKEN = 'cm-test';
  const result = await getCodemagicBuildStatus('build-123', {
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://codemagic.io/api/v3/builds/build-123');
      assert.equal(options.headers['x-auth-token'], 'cm-test');
      return { ok: true, json: async () => ({ data: { status: 'finished', artifacts: [{ name: 'app-debug.apk' }] } }) };
    }
  });
  assert.equal(result.status, 'finished');
  assert.equal(result.finished, true);
  assert.equal(result.failed, false);
  assert.equal(result.artifacts[0].name, 'app-debug.apk');
  delete process.env.CODEMAGIC_API_TOKEN;
});
