import test from 'node:test';
import assert from 'node:assert/strict';
import { generateAIPlan, AIProviderError } from '../src/ai-provider.mjs';

test('AI provider rejects missing configuration without a network call', async () => {
  const oldKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  await assert.rejects(
    () => generateAIPlan({ title: 'Test', brief: 'Test', stage: 'IDEA', fetchImpl: async () => { throw new Error('NETWORK_CALLED'); } }),
    (error) => error instanceof AIProviderError && error.code === 'AI_PROVIDER_NOT_CONFIGURED'
  );
  if (oldKey) process.env.OPENAI_API_KEY = oldKey;
});

test('AI provider parses structured JSON response', async () => {
  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';
  const result = await generateAIPlan({
    title: 'Test', brief: 'Build an app', stage: 'IDEA',
    fetchImpl: async (_url, options) => {
      assert.equal(options.headers.authorization, 'Bearer test-key');
      const body = JSON.parse(options.body);
      assert.equal(body.model, process.env.OPENAI_MODEL || 'gpt-5-mini');
      return { ok: true, json: async () => ({ output_text: JSON.stringify({ objective: 'x', deliverables: [], acceptanceCriteria: [], risks: [], nextAction: 'y' }) }) };
    }
  });
  assert.equal(result.objective, 'x');
  if (oldKey) process.env.OPENAI_API_KEY = oldKey; else delete process.env.OPENAI_API_KEY;
});
