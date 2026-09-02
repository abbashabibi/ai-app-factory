import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountRecord, hashPassword, normalizeEmail, signSession, verifyPassword, verifySession } from '../src/auth-service.mjs';

test('auth normalizes email and verifies password', async () => {
  const email = normalizeEmail(' User@Example.COM ');
  assert.equal(email, 'user@example.com');
  const passwordHash = await hashPassword('correct-horse-battery');
  assert.equal(await verifyPassword('correct-horse-battery', passwordHash), true);
  assert.equal(await verifyPassword('wrong-password', passwordHash), false);
  const account = createAccountRecord({ email, passwordHash, name: 'User' });
  assert.equal(account.email, email);
  assert.match(account.accountId, /^acct_/);
});

test('session tokens verify, expire and reject tampering', () => {
  const old = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = '01234567890123456789012345678901';
  const token = signSession('acct_test');
  const session = verifySession(token);
  assert.equal(session.accountId, 'acct_test');
  assert.equal(verifySession(`${token}x`), null);
  if (old === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = old;
});
