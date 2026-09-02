const GITHUB_API = process.env.GITHUB_API_URL || 'https://api.github.com';

export class GitHubServiceError extends Error {
  constructor(message, code = 'GITHUB_ERROR') {
    super(message);
    this.name = 'GitHubServiceError';
    this.code = code;
  }
}

function requireConfig() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new GitHubServiceError('GITHUB_NOT_CONFIGURED', 'GITHUB_NOT_CONFIGURED');
  return token;
}

function headers(token) {
  return {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'x-github-api-version': process.env.GITHUB_API_VERSION || '2026-03-10',
    'content-type': 'application/json',
  };
}

async function request(path, options, fetchImpl) {
  const token = requireConfig();
  const response = await fetchImpl(`${GITHUB_API}${path}`, { ...options, headers: { ...headers(token), ...(options.headers || {}) } });
  if (!response.ok) throw new GitHubServiceError(`GITHUB_HTTP_${response.status}`);
  return response.json();
}

function assertPath(path) {
  if (!path || typeof path !== 'string' || path.startsWith('/') || path.includes('..') || path.endsWith('/')) {
    throw new GitHubServiceError('GITHUB_INVALID_FILE_PATH', 'GITHUB_INVALID_FILE_PATH');
  }
}

export async function commitFiles({ repository, branch = 'main', message, files, fetchImpl = fetch } = {}) {
  if (!repository || !/^[^/]+\/[^/]+$/.test(repository)) throw new GitHubServiceError('GITHUB_INVALID_REPOSITORY', 'GITHUB_INVALID_REPOSITORY');
  if (!message || typeof message !== 'string') throw new GitHubServiceError('GITHUB_COMMIT_MESSAGE_MISSING', 'GITHUB_COMMIT_MESSAGE_MISSING');
  if (!Array.isArray(files) || files.length === 0) throw new GitHubServiceError('GITHUB_FILES_MISSING', 'GITHUB_FILES_MISSING');
  for (const file of files) {
    assertPath(file?.path);
    if (typeof file?.content !== 'string') throw new GitHubServiceError('GITHUB_FILE_CONTENT_MISSING', 'GITHUB_FILE_CONTENT_MISSING');
  }

  const [owner, repo] = repository.split('/');
  const ref = await request(`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`, { method: 'GET' }, fetchImpl);
  const parentSha = ref?.object?.sha;
  if (!parentSha) throw new GitHubServiceError('GITHUB_PARENT_SHA_MISSING', 'GITHUB_PARENT_SHA_MISSING');
  const parentCommit = await request(`/repos/${owner}/${repo}/git/commits/${encodeURIComponent(parentSha)}`, { method: 'GET' }, fetchImpl);
  const baseTree = parentCommit?.tree?.sha;
  if (!baseTree) throw new GitHubServiceError('GITHUB_BASE_TREE_MISSING', 'GITHUB_BASE_TREE_MISSING');

  const blobs = [];
  for (const file of files) {
    const blob = await request(`/repos/${owner}/${repo}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content: Buffer.from(file.content, 'utf8').toString('base64'), encoding: 'base64' }),
    }, fetchImpl);
    if (!blob?.sha) throw new GitHubServiceError('GITHUB_BLOB_SHA_MISSING', 'GITHUB_BLOB_SHA_MISSING');
    blobs.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
  }

  const tree = await request(`/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: baseTree, tree: blobs }),
  }, fetchImpl);
  if (!tree?.sha) throw new GitHubServiceError('GITHUB_TREE_SHA_MISSING', 'GITHUB_TREE_SHA_MISSING');

  const commit = await request(`/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message, tree: tree.sha, parents: [parentSha] }),
  }, fetchImpl);
  if (!commit?.sha) throw new GitHubServiceError('GITHUB_COMMIT_SHA_MISSING', 'GITHUB_COMMIT_SHA_MISSING');

  const updatedRef = await request(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha, force: false }),
  }, fetchImpl);
  if (!updatedRef?.object?.sha) throw new GitHubServiceError('GITHUB_REF_UPDATE_FAILED', 'GITHUB_REF_UPDATE_FAILED');

  return { repository, branch, commitSha: commit.sha, treeSha: tree.sha, parentSha, files: files.map((file) => file.path) };
}
