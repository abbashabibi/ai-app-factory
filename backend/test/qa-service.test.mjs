import test from 'node:test';
import assert from 'node:assert/strict';
import { runSourceQA } from '../src/qa-service.mjs';

const validFiles = [
  { path: 'settings.gradle', content: 'rootProject.name = "GeneratedApp"' },
  { path: 'app/build.gradle', content: 'plugins { id "com.android.application" }' },
  { path: 'app/src/main/AndroidManifest.xml', content: '<manifest />' },
];

test('source QA passes a minimal safe Android manifest', () => {
  const result = runSourceQA({ files: validFiles, commitSha: 'abc123' });
  assert.equal(result.passed, true);
  assert.equal(result.gate, 'QA_PASSED');
});

test('source QA rejects secrets and unsafe files', () => {
  const result = runSourceQA({
    files: [
      ...validFiles,
      { path: '../secret.txt', content: 'sk-abcdefghijklmnopqrstuvwxyz1234567890' },
    ],
    commitSha: 'abc123',
  });
  assert.equal(result.passed, false);
  assert.ok(result.findings.some((item) => item.code === 'UNSAFE_PATH'));
});

test('source QA requires an Android module', () => {
  const result = runSourceQA({ files: [{ path: 'settings.gradle', content: 'rootProject.name = "x"' }], commitSha: 'abc123' });
  assert.equal(result.passed, false);
  assert.ok(result.findings.some((item) => item.code === 'ANDROID_APP_MODULE_MISSING'));
});
