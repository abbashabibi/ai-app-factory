import { Pool } from 'pg';

const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, max: Number(process.env.DB_POOL_MAX || 10), idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000, ssl: process.env.DATABASE_SSL === 'disable' ? false : { rejectUnauthorized: false } }) : null;
const memory = { accounts: new Map(), projects: new Map() };

export function storageMode() { return pool ? 'postgres' : 'memory'; }

export async function initStorage() {
  if (!pool) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS accounts (account_id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL DEFAULT '', password_hash TEXT NOT NULL, status TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS projects (project_id TEXT PRIMARY KEY, account_id TEXT NOT NULL, title TEXT NOT NULL, brief TEXT NOT NULL DEFAULT '', state JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS projects_account_id_idx ON projects(account_id)`);
}

export async function saveAccount(account) {
  if (!pool) { memory.accounts.set(account.accountId, structuredClone(account)); return account; }
  await pool.query(`INSERT INTO accounts(account_id,email,name,password_hash,status,created_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(account_id) DO UPDATE SET email=EXCLUDED.email,name=EXCLUDED.name,password_hash=EXCLUDED.password_hash,status=EXCLUDED.status`, [account.accountId, account.email, account.name, account.passwordHash, account.status, account.createdAt]);
  return account;
}

export async function findAccountByEmail(email) {
  if (!pool) return [...memory.accounts.values()].find((a) => a.email === email) || null;
  const { rows } = await pool.query(`SELECT account_id AS "accountId",email,name,password_hash AS "passwordHash",status,created_at AS "createdAt" FROM accounts WHERE email=$1 LIMIT 1`, [email]);
  return rows[0] || null;
}

export async function findAccountById(accountId) {
  if (!pool) return memory.accounts.get(accountId) || null;
  const { rows } = await pool.query(`SELECT account_id AS "accountId",email,name,password_hash AS "passwordHash",status,created_at AS "createdAt" FROM accounts WHERE account_id=$1 LIMIT 1`, [accountId]);
  return rows[0] || null;
}

export async function saveProject(project) {
  if (!pool) { memory.projects.set(project.projectId, structuredClone(project)); return project; }
  await pool.query(`INSERT INTO projects(project_id,account_id,title,brief,state,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(project_id) DO UPDATE SET state=EXCLUDED.state,title=EXCLUDED.title,brief=EXCLUDED.brief,updated_at=EXCLUDED.updated_at`, [project.projectId, project.accountId, project.title, project.brief, JSON.stringify(project), project.createdAt, project.updatedAt]);
  return project;
}

export async function findProjectById(projectId) {
  if (!pool) return memory.projects.get(projectId) || null;
  const { rows } = await pool.query(`SELECT state FROM projects WHERE project_id=$1 LIMIT 1`, [projectId]);
  return rows[0]?.state || null;
}

export async function listProjects(accountId) {
  if (!pool) return [...memory.projects.values()].filter((p) => p.accountId === accountId);
  const { rows } = await pool.query(`SELECT state FROM projects WHERE account_id=$1 ORDER BY updated_at DESC`, [accountId]);
  return rows.map((r) => r.state);
}

export async function closeStorage() { if (pool) await pool.end(); }
