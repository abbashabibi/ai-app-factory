import test from 'node:test';
import assert from 'node:assert/strict';
import { commitFiles, GitHubServiceError } from '../src/github-service.mjs';

test('GitHub source service rejects missing configuration before network access', async () => {
  const oldToken = process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_TOKEN;
  await assert.rejects(
    () => commitFiles({ repository: 'owner/repo', message: 'test', files: [{ path: 'app.txt', content: 'hello' }], fetchImpl: async () => { throw new Error('NETWORK_CALLED'); } }),
    (error) => error instanceof GitHubServiceError && error.code === 'GITHUB_NOT_CONFIGURED'
  );
  if (oldToken) process.env.GITHUB_TOKEN = oldToken;
});

test('GitHub source service creates blobs, tree, commit and fast-forwards the branch', async () => {
  process.env.GITHUB_TOKEN = 'gh-test';
  const calls = [];
  const responses = [
    { object: { sha: 'parent-1' } },
    { tree: { sha: 'tree-1' } },
    { sha: 'blob-1' },
    { sha: 'blob-2' },
    { sha: 'tree-2' },
    { sha: 'commit-2' },
    { object: { sha: 'commit-2' } },
  ];
  let index = 0;
  const result = await commitFiles({
    repository: 'owner/repo',
    branch: 'main',
    message: 'feat: generated source',
    files: [{ path: 'app.txt', content: 'hello' }, { path: 'src/main.txt', content: 'world' }],
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async () => responses[index++] };
    },
  });
  assert.equal(result.commitSha, 'commit-2');
  assert.deepEqual(result.files, ['app.txt', 'src/main.txt']);
  assert.equal(calls[2].options.method, 'POST');
  assert.equal(JSON.parse(calls[2].options.body).encoding, 'base64');
  assert.equal(JSON.parse(calls[4].options.body).base_tree, 'tree-1');
  assert.equal(JSON.parse(calls[5].options.body).tree, 'tree-2');
  assert.equal(JSON.parse(calls[6].options.body).sha, 'commit-2');
  assert.equal(calls[6].options.method, 'PATCH');
  delete process.env.GITHUB_TOKEN;
});

test('GitHub source service blocks unsafe paths', async () => {
  process.env.GITHUB_TOKEN = 'gh-test';
  await assert.rejects(
    () => commitFiles({ repository: 'owner/repo', message: 'test', files: [{ path: '../secret', content: 'x' }], fetchImpl: async () => { throw new Error('NETWORK_CALLED'); } }),
    (error) => error instanceof GitHubServiceError && error.code === 'GITHUB_INVALID_FILE_PATH'
  );
  delete process.env.GITHUB_TOKEN;
});
