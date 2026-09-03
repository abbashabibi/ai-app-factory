import { Pool } from 'pg';

function ssl() {
  if (process.env.DATABASE_SSL === 'disable') return false;
  const ca = process.env.DATABASE_SSL_CA;
  return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
}

const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: ssl(),
}) : null;

const SELECT = `SELECT job_id AS "jobId", project_id AS "projectId", account_id AS "accountId", kind, state, current_stage AS "currentStage", attempt, created_at AS "createdAt", updated_at AS "updatedAt", started_at AS "startedAt", finished_at AS "finishedAt", error, metadata FROM execution_jobs`;

export async function recoverStaleJobs() {
  if (!pool) return 0;
  const leaseMs = Math.max(60000, Number(process.env.JOB_LEASE_MS || 900000));
  const cutoff = new Date(Date.now() - leaseMs).toISOString();
  const result = await pool.query(`UPDATE execution_jobs SET state='QUEUED', error='WORKER_LEASE_EXPIRED', updated_at=$1 WHERE state='RUNNING' AND updated_at < $2`, [new Date().toISOString(), cutoff]);
  return result.rowCount || 0;
}

export async function claimNextQueuedJob() {
  if (!pool) return null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`${SELECT} WHERE state='QUEUED' ORDER BY updated_at ASC FOR UPDATE SKIP LOCKED LIMIT 1`);
    if (!rows[0]) { await client.query('COMMIT'); return null; }
    const now = new Date().toISOString();
    await client.query(`UPDATE execution_jobs SET state='RUNNING', attempt=attempt+1, started_at=$2, updated_at=$2, error=NULL WHERE job_id=$1`, [rows[0].jobId, now]);
    await client.query('COMMIT');
    return { ...rows[0], state: 'RUNNING', attempt: rows[0].attempt + 1, startedAt: now, updatedAt: now, error: null };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
