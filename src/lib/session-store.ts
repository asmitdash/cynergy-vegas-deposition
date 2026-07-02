/**
 * Session state — Neon Postgres if DATABASE_URL/POSTGRES_URL is configured,
 * in-memory fallback for local dev.
 *
 * Sessions live in the `vegas_sessions` table with a TTL enforced by a lazy
 * sweep in activeSessionCount(). The in-memory branch is only taken when NO
 * Postgres connection string is present at import time (dev safety net) —
 * on Vercel we always want Postgres so state persists across lambdas.
 *
 * Public API preserved:
 *   activeSessionCount, createSession, getSession,
 *   updateCaseDataset, deleteSession, CONCURRENCY_LIMIT
 */

import { Pool, type QueryResult, type QueryResultRow } from "pg";

const ttlSeconds = (Number(process.env.FEATURE_SESSION_TTL_MINUTES) || 45) * 60;
const MAX_CONCURRENT = Number(process.env.FEATURE_MAX_CONCURRENT_SESSIONS) || 10;

type SessionMeta = {
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  caseDatasetId?: string;
  storyId?: string;
};

const CONN =
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL;

const usePostgres = !!CONN;

// ---------- Postgres branch ----------

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function getPool(): Pool {
  if (!pool) {
    if (!CONN) throw new Error("no Postgres connection string configured");
    pool = new Pool({
      connectionString: CONN,
      max: 3,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const p = getPool();
      await p.query(`
        CREATE TABLE IF NOT EXISTS vegas_sessions (
          id               TEXT PRIMARY KEY,
          created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at       TIMESTAMPTZ NOT NULL,
          case_dataset_id  TEXT,
          story_id         TEXT
        );
      `);
      await p.query(
        `CREATE INDEX IF NOT EXISTS vegas_sessions_expires_at_idx ON vegas_sessions (expires_at);`,
      );
    })();
  }
  return schemaReady;
}

async function q<T extends QueryResultRow>(
  sql: string,
  args: unknown[] = [],
): Promise<QueryResult<T>> {
  await ensureSchema();
  return getPool().query<T>(sql, args);
}

type SessionRow = {
  id: string;
  created_at: Date | string;
  expires_at: Date | string;
  case_dataset_id: string | null;
  story_id: string | null;
};

function rowToMeta(row: SessionRow): SessionMeta {
  const createdAt =
    row.created_at instanceof Date
      ? row.created_at.toISOString()
      : new Date(row.created_at).toISOString();
  const expiresAt =
    row.expires_at instanceof Date
      ? row.expires_at.toISOString()
      : new Date(row.expires_at).toISOString();
  return {
    sessionId: row.id,
    createdAt,
    expiresAt,
    caseDatasetId: row.case_dataset_id ?? undefined,
    storyId: row.story_id ?? undefined,
  };
}

// ---------- In-memory fallback branch ----------

const memoryStore = new Map<string, SessionMeta>();

// ---------- Public API ----------

export async function activeSessionCount(): Promise<number> {
  if (usePostgres) {
    // TTL sweep before counting.
    await q(`DELETE FROM vegas_sessions WHERE expires_at < NOW()`);
    const r = await q<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM vegas_sessions`,
    );
    return Number(r.rows[0]?.c ?? 0);
  }
  return memoryStore.size;
}

export async function createSession(
  sessionId: string,
  caseDatasetId?: string,
  storyId?: string,
): Promise<SessionMeta> {
  const now = new Date();
  const expires = new Date(now.getTime() + ttlSeconds * 1000);
  const meta: SessionMeta = {
    sessionId,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    caseDatasetId,
    storyId,
  };
  if (usePostgres) {
    await q(
      `INSERT INTO vegas_sessions (id, created_at, expires_at, case_dataset_id, story_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE
         SET created_at = EXCLUDED.created_at,
             expires_at = EXCLUDED.expires_at,
             case_dataset_id = EXCLUDED.case_dataset_id,
             story_id = EXCLUDED.story_id`,
      [sessionId, now.toISOString(), expires.toISOString(), caseDatasetId ?? null, storyId ?? null],
    );
  } else {
    memoryStore.set(sessionId, meta);
    setTimeout(() => memoryStore.delete(sessionId), ttlSeconds * 1000);
  }
  return meta;
}

export async function getSession(sessionId: string): Promise<SessionMeta | null> {
  if (usePostgres) {
    const r = await q<SessionRow>(
      `SELECT id, created_at, expires_at, case_dataset_id, story_id
         FROM vegas_sessions
        WHERE id = $1 AND expires_at >= NOW()`,
      [sessionId],
    );
    const row = r.rows[0];
    return row ? rowToMeta(row) : null;
  }
  return memoryStore.get(sessionId) ?? null;
}

export async function updateCaseDataset(
  sessionId: string,
  caseDatasetId: string,
): Promise<void> {
  if (usePostgres) {
    await q(
      `UPDATE vegas_sessions SET case_dataset_id = $2 WHERE id = $1`,
      [sessionId, caseDatasetId],
    );
    return;
  }
  const existing = memoryStore.get(sessionId);
  if (!existing) return;
  memoryStore.set(sessionId, { ...existing, caseDatasetId });
}

export async function deleteSession(sessionId: string): Promise<void> {
  if (usePostgres) {
    await q(`DELETE FROM vegas_sessions WHERE id = $1`, [sessionId]);
    return;
  }
  memoryStore.delete(sessionId);
}

export const CONCURRENCY_LIMIT = MAX_CONCURRENT;
