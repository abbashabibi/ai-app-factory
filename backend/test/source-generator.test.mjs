import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSourceManifest, generateSource } from '../src/source-generator.mjs';

test('validateSourceManifest accepts a valid Android source manifest', () => {
  const result = validateSourceManifest({ summary: 'android app', files: [
    { path: 'settings.gradle', content: 'pluginManagement {}' },
    { path: 'app/src/main/AndroidManifest.xml', content: '<manifest />' },
  ] });
  assert.equal(result.files.length, 2);
});

test('validateSourceManifest rejects traversal paths', () => {
  assert.throws(() => validateSourceManifest({ files: [{ path: '../secret', content: 'x' }] }), /SOURCE_INVALID_FILE_PATH/);
});

test('generateSource requires provider configuration before network use', async () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  await assert.rejects(() => generateSource({ title: 'x', brief: 'y', plan: {} }), /AI_PROVIDER_NOT_CONFIGURED/);
  if (previous !== undefined) process.env.OPENAI_API_KEY = previous;
});

test('generateSource parses and validates model output', async () => {
  const previous = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';
  const fetchImpl = async () => ({
    ok: true,
    async json() { return { output_text: JSON.stringify({ summary: 'ok', files: [{ path: 'settings.gradle', content: 'rootProject.name = "Demo"' }] }) }; }
  });
  const result = await generateSource({ title: 'Demo', brief: 'Build app', plan: {}, fetchImpl });
  assert.equal(result.files[0].path, 'settings.gradle');
  if (previous === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = previous;
});
