const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';

export class AIProviderError extends Error {
  constructor(message, code = 'AI_PROVIDER_ERROR') {
    super(message);
    this.name = 'AIProviderError';
    this.code = code;
  }
}

function extractOutput(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const parts = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

export async function generateAIPlan({ title, brief, stage, model = DEFAULT_MODEL, fetchImpl = fetch }) {
  if (process.env.APP_FACTORY_E2E_MODE === '1') {
    return {
      objective: `Build a production-ready Android app for ${title}`,
      deliverables: ['requirements', 'architecture', 'UI/UX specification', 'buildable Android source'],
      acceptanceCriteria: ['source manifest is valid', 'QA gate passes', 'cloud build reaches finished state', 'APK artifact is available'],
      risks: ['provider credentials must be configured in production', 'generated code must pass real compilation'],
      nextAction: 'Generate the source manifest and run the QA/build pipeline.',
      e2e: true,
      stage,
      brief,
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AIProviderError('AI_PROVIDER_NOT_CONFIGURED', 'AI_PROVIDER_NOT_CONFIGURED');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.AI_TIMEOUT_MS || 30000));
  try {
    const response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'system',
            content: 'You are the planning intelligence of a professional AI App Factory. Return valid JSON only. Create actionable, testable output for the requested pipeline stage. Never claim that code, builds, credentials, or external actions were completed unless actually verified.'
          },
          {
            role: 'user',
            content: JSON.stringify({ title, brief, stage, required: ['objective', 'deliverables', 'acceptanceCriteria', 'risks', 'nextAction'] })
          }
        ],
        text: { format: { type: 'json_object' } }
      })
    });
    if (!response.ok) throw new AIProviderError(`AI_PROVIDER_HTTP_${response.status}`);
    const data = await response.json();
    const text = extractOutput(data);
    if (!text) throw new AIProviderError('AI_EMPTY_RESPONSE');
    try { return JSON.parse(text); } catch { throw new AIProviderError('AI_INVALID_JSON'); }
  } catch (error) {
    if (error instanceof AIProviderError) throw error;
    if (error.name === 'AbortError') throw new AIProviderError('AI_TIMEOUT', 'AI_TIMEOUT');
    throw new AIProviderError('AI_NETWORK_ERROR', 'AI_NETWORK_ERROR');
  } finally {
    clearTimeout(timeout);
  }
}
