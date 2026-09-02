export class QAServiceError extends Error {
  constructor(message, code = 'QA_FAILED') {
    super(message);
    this.name = 'QAServiceError';
    this.code = code;
  }
}

const MAX_FILES = 50;
const MAX_FILE_BYTES = 256 * 1024;
const MAX_TOTAL_BYTES = 5 * 1024 * 1024;
const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /AIza[0-9A-Za-z_-]{20,}/,
];

function byteLength(value) {
  return Buffer.byteLength(String(value ?? ''), 'utf8');
}

export function runSourceQA({ files, commitSha = null } = {}) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new QAServiceError('QA_FILES_MISSING', 'QA_FILES_MISSING');
  }
  if (files.length > MAX_FILES) {
    throw new QAServiceError('QA_TOO_MANY_FILES', 'QA_TOO_MANY_FILES');
  }
  if (!commitSha || typeof commitSha !== 'string') {
    throw new QAServiceError('QA_COMMIT_MISSING', 'QA_COMMIT_MISSING');
  }

  const seen = new Set();
  const findings = [];
  let totalBytes = 0;

  for (const file of files) {
    const path = String(file?.path || '');
    const content = String(file?.content ?? '');
    if (!path || path.startsWith('/') || path.includes('..') || path.endsWith('/')) {
      findings.push({ severity: 'error', code: 'UNSAFE_PATH', path });
      continue;
    }
    if (seen.has(path)) {
      findings.push({ severity: 'error', code: 'DUPLICATE_PATH', path });
      continue;
    }
    seen.add(path);
    const size = byteLength(content);
    totalBytes += size;
    if (size > MAX_FILE_BYTES) findings.push({ severity: 'error', code: 'FILE_TOO_LARGE', path });
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(content)) findings.push({ severity: 'error', code: 'SECRET_DETECTED', path });
    }
    if (/\.(png|jpe?g|gif|webp|zip|apk|aab|keystore)$/i.test(path)) {
      findings.push({ severity: 'error', code: 'BINARY_FILE', path });
    }
  }

  if (totalBytes > MAX_TOTAL_BYTES) findings.push({ severity: 'error', code: 'TOTAL_SIZE_TOO_LARGE' });

  const hasGradleSettings = files.some((file) => file?.path === 'settings.gradle' || file?.path === 'settings.gradle.kts');
  const hasAppModule = files.some((file) => file?.path === 'app/build.gradle' || file?.path === 'app/build.gradle.kts');
  if (!hasGradleSettings) findings.push({ severity: 'error', code: 'ANDROID_SETTINGS_MISSING' });
  if (!hasAppModule) findings.push({ severity: 'error', code: 'ANDROID_APP_MODULE_MISSING' });

  const passed = findings.every((item) => item.severity !== 'error');
  return {
    passed,
    commitSha,
    checkedFiles: files.length,
    totalBytes,
    findings,
    gate: passed ? 'QA_PASSED' : 'QA_FAILED',
    checkedAt: new Date().toISOString(),
  };
}
