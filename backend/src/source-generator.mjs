import { AIProviderError } from './ai-provider.mjs';

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';
const MAX_FILES = 50;
const MAX_FILE_BYTES = 200_000;
const MAX_TOTAL_BYTES = 2_000_000;

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

function validatePath(path) {
  if (typeof path !== 'string' || !path.trim() || path.startsWith('/') || path.includes('..') || path.endsWith('/')) {
    throw new AIProviderError('SOURCE_INVALID_FILE_PATH', 'SOURCE_INVALID_FILE_PATH');
  }
  return path;
}

export function validateSourceManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.files)) {
    throw new AIProviderError('SOURCE_INVALID_MANIFEST', 'SOURCE_INVALID_MANIFEST');
  }
  if (manifest.files.length === 0 || manifest.files.length > MAX_FILES) {
    throw new AIProviderError('SOURCE_FILE_COUNT_INVALID', 'SOURCE_FILE_COUNT_INVALID');
  }

  let total = 0;
  const seen = new Set();
  const files = manifest.files.map((file) => {
    const path = validatePath(file?.path);
    if (seen.has(path)) throw new AIProviderError('SOURCE_DUPLICATE_PATH', 'SOURCE_DUPLICATE_PATH');
    seen.add(path);
    if (typeof file?.content !== 'string') throw new AIProviderError('SOURCE_FILE_CONTENT_MISSING', 'SOURCE_FILE_CONTENT_MISSING');
    const size = Buffer.byteLength(file.content, 'utf8');
    if (size > MAX_FILE_BYTES) throw new AIProviderError('SOURCE_FILE_TOO_LARGE', 'SOURCE_FILE_TOO_LARGE');
    total += size;
    return { path, content: file.content };
  });
  if (total > MAX_TOTAL_BYTES) throw new AIProviderError('SOURCE_TOTAL_SIZE_TOO_LARGE', 'SOURCE_TOTAL_SIZE_TOO_LARGE');
  return { files, summary: typeof manifest.summary === 'string' ? manifest.summary : '' };
}

function mockSourceManifest() {
  return validateSourceManifest({
    summary: 'Deterministic E2E Android project used only for pipeline verification.',
    files: [
      { path: 'settings.gradle', content: "pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }\ndependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }\nrootProject.name = 'E2EApp'\ninclude ':app'\n" },
      { path: 'build.gradle', content: "plugins { id 'com.android.application' version '8.7.3' apply false }\n" },
      { path: 'app/build.gradle', content: "plugins { id 'com.android.application' }\n\nandroid { namespace 'com.example.e2e'; compileSdk 35\n    defaultConfig { applicationId 'com.example.e2e'; minSdk 23; targetSdk 35; versionCode 1; versionName '1.0' }\n}\n" },
      { path: 'app/src/main/AndroidManifest.xml', content: "<manifest xmlns:android=\"http://schemas.android.com/apk/res/android\"><application android:theme=\"@style/AppTheme\" android:label=\"AI App Factory E2E\"><activity android:name=\".MainActivity\" android:exported=\"true\"><intent-filter><action android:name=\"android.intent.action.MAIN\"/><category android:name=\"android.intent.category.LAUNCHER\"/></intent-filter></activity></application></manifest>" },
      { path: 'app/src/main/java/com/example/e2e/MainActivity.java', content: "package com.example.e2e;\nimport android.app.Activity;\nimport android.os.Bundle;\nimport android.widget.TextView;\npublic class MainActivity extends Activity { @Override public void onCreate(Bundle state) { super.onCreate(state); TextView view = new TextView(this); view.setText(\"AI App Factory E2E\"); setContentView(view); } }\n" },
      { path: 'app/src/main/res/values/styles.xml', content: "<resources><style name=\"AppTheme\" parent=\"android:style/Theme.Material.Light.NoActionBar\"/></resources>" }
    ]
  });
}

export async function generateSource({ title, brief, plan, model = DEFAULT_MODEL, fetchImpl = fetch }) {
  if (process.env.APP_FACTORY_E2E_MODE === '1') return mockSourceManifest();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AIProviderError('AI_PROVIDER_NOT_CONFIGURED', 'AI_PROVIDER_NOT_CONFIGURED');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.AI_TIMEOUT_MS || 60000));
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
            content: 'You are the Code Generation Agent of a professional AI App Factory. Return valid JSON only. Generate a complete, buildable Android project source manifest from the supplied requirements. Prefer a minimal native Android/Gradle project when no framework is specified. Every file must be UTF-8 text. Never include secrets, credentials, generated binaries, or claims that a build was verified. The output schema is {"summary":"string","files":[{"path":"string","content":"string"}]}. Include all files required to build the requested app; do not omit Gradle settings or the application module.'
          },
          {
            role: 'user',
            content: JSON.stringify({ title, brief, plan })
          }
        ],
        text: { format: { type: 'json_object' } }
      })
    });
    if (!response.ok) throw new AIProviderError(`AI_PROVIDER_HTTP_${response.status}`);
    const data = await response.json();
    const text = extractOutput(data);
    if (!text) throw new AIProviderError('AI_EMPTY_RESPONSE');
    let manifest;
    try { manifest = JSON.parse(text); } catch { throw new AIProviderError('AI_INVALID_JSON'); }
    return validateSourceManifest(manifest);
  } catch (error) {
    if (error instanceof AIProviderError) throw error;
    if (error.name === 'AbortError') throw new AIProviderError('AI_TIMEOUT', 'AI_TIMEOUT');
    throw new AIProviderError('AI_NETWORK_ERROR', 'AI_NETWORK_ERROR');
  } finally {
    clearTimeout(timeout);
  }
}
