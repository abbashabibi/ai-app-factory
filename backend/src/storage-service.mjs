import { Pool } from 'pg';

function postgresSsl() {
  if (process.env.DATABASE_SSL === 'disable') return false;
  const ca = process.env.DATABASE_SSL_CA;
  if (ca) return { rejectUnauthorized: true, ca };
  return { rejectUnauthorized: true };
}

const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: postgresSsl()
}) : null;
const memory = { accounts: new Map(), projects: new Map(), jobs: new Map() };

export function storageMode() { return pool ? 'postgres' : 'memory'; }

export async function initStorage() {
  if (!pool) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS accounts (account_id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL DEFAULT '', password_hash TEXT NOT NULL, status TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS projects (project_id TEXT PRIMARY KEY, account_id TEXT NOT NULL, title TEXT NOT NULL, brief TEXT NOT NULL DEFAULT '', state JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS projects_account_id_idx ON projects(account_id)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS execution_jobs (job_id TEXT PRIMARY KEY, project_id TEXT NOT NULL, account_id TEXT NOT NULL, kind TEXT NOT NULL, state TEXT NOT NULL, current_stage TEXT NOT NULL, attempt INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ, error TEXT, metadata JSONB NOT NULL DEFAULT '{}'::jsonb)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS execution_jobs_project_id_idx ON execution_jobs(project_id)`);
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

export async function hydrateProjects(target) {
  if (!pool) return target;
  const { rows } = await pool.query(`SELECT state FROM projects ORDER BY updated_at DESC`);
  for (const row of rows) target.set(row.state.projectId, row.state, { persist: false });
  return target;
}

export function createPersistentProjectMap() {
  const backing = new Map();
  const api = {
    get: (key) => backing.get(key),
    set: (key, value, options = {}) => {
      backing.set(key, value);
      if (options.persist !== false) void saveProject(value).catch((error) => console.error('PROJECT_PERSISTENCE_ERROR', error.code || error.message));
      return api;
    },
    has: (key) => backing.has(key),
    values: () => backing.values(),
    entries: () => backing.entries(),
    [Symbol.iterator]: () => backing[Symbol.iterator](),
  };
  return api;
}

export async function closeStorage() { if (pool) await pool.end(); }

export async function saveJob(job) { if (!pool) { memory.jobs.set(job.jobId, structuredClone(job)); return job; } await pool.query(`INSERT INTO execution_jobs(job_id,project_id,account_id,kind,state,current_stage,attempt,created_at,updated_at,started_at,finished_at,error,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(job_id) DO UPDATE SET state=EXCLUDED.state,current_stage=EXCLUDED.current_stage,attempt=EXCLUDED.attempt,updated_at=EXCLUDED.updated_at,started_at=EXCLUDED.started_at,finished_at=EXCLUDED.finished_at,error=EXCLUDED.error,metadata=EXCLUDED.metadata`, [job.jobId,job.projectId,job.accountId,job.kind,job.state,job.currentStage,job.attempt,job.createdAt,job.updatedAt,job.startedAt,job.finishedAt,job.error,JSON.stringify(job.metadata||{})]); return job; }
export async function findJobById(jobId) { if (!pool) return memory.jobs.get(jobId) || null; const { rows }=await pool.query(`SELECT job_id AS "jobId",project_id AS "projectId",account_id AS "accountId",kind,state,current_stage AS "currentStage",attempt,created_at AS "createdAt",updated_at AS "updatedAt",started_at AS "startedAt",finished_at AS "finishedAt",error,metadata FROM execution_jobs WHERE job_id=$1 LIMIT 1`,[jobId]); return rows[0]||null; }
export async function listJobs(accountId) { if (!pool) return [...memory.jobs.values()].filter(j=>j.accountId===accountId); const { rows }=await pool.query(`SELECT job_id AS "jobId",project_id AS "projectId",account_id AS "accountId",kind,state,current_stage AS "currentStage",attempt,created_at AS "createdAt",updated_at AS "updatedAt",started_at AS "startedAt",finished_at AS "finishedAt",error,metadata FROM execution_jobs WHERE account_id=$1 ORDER BY updated_at DESC`,[accountId]); return rows; }
