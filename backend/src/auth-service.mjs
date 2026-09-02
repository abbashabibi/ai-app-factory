import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AuthError extends Error {
  constructor(message, code = 'AUTH_ERROR') {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
    throw new AuthError('PASSWORD_INVALID', 'PASSWORD_INVALID');
  }
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `${salt.toString('base64url')}.${Buffer.from(derived).toString('base64url')}`;
}

export async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || typeof encoded !== 'string') return false;
  const [saltText, hashText] = encoded.split('.');
  if (!saltText || !hashText) return false;
  try {
    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(hashText, 'base64url');
    const actual = Buffer.from(await scrypt(password, salt, expected.length || 64, { N: 16384, r: 8, p: 1 }));
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function normalizeEmail(email) {
  if (typeof email !== 'string') throw new AuthError('EMAIL_INVALID', 'EMAIL_INVALID');
  const value = email.trim().toLowerCase();
  if (!EMAIL_RE.test(value) || value.length > 254) throw new AuthError('EMAIL_INVALID', 'EMAIL_INVALID');
  return value;
}

export function createAccountRecord({ email, passwordHash, name = '' } = {}) {
  if (!passwordHash) throw new AuthError('PASSWORD_HASH_MISSING', 'PASSWORD_HASH_MISSING');
  return {
    accountId: `acct_${randomBytes(10).toString('hex')}`,
    email: normalizeEmail(email),
    name: typeof name === 'string' ? name.trim().slice(0, 120) : '',
    passwordHash,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };
}

export function publicAccount(account) {
  if (!account) return null;
  return { accountId: account.accountId, email: account.email, name: account.name, status: account.status, createdAt: account.createdAt };
}

export function signSession(accountId, secret = process.env.SESSION_SECRET) {
  if (!secret || secret.length < 32) throw new AuthError('SESSION_SECRET_NOT_CONFIGURED', 'SESSION_SECRET_NOT_CONFIGURED');
  const payload = Buffer.from(JSON.stringify({ sub: accountId, iat: Date.now(), exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const { createHmac } = require('node:crypto');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
