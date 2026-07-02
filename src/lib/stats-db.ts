/**
 * Stats storage on Neon Postgres.
 * Tracks anonymous accusations per (story_id, accused_id) plus verdict outcomes.
 * Schema is initialised lazily on first write.
 */

import { Pool, type QueryResult, type QueryResultRow } from "pg";

const CONN =
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL;

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
        CREATE TABLE IF NOT EXISTS vegas_accusations (
          id           BIGSERIAL PRIMARY KEY,
          story_id     TEXT NOT NULL,
          session_id   TEXT NOT NULL,
          accused_id   TEXT NOT NULL,
          accused_name TEXT NOT NULL,
          culprit_id   TEXT NOT NULL,
          correct      BOOLEAN NOT NULL,
          evidence     TEXT[] DEFAULT '{}',
          created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(session_id)
        );
      `);
      await p.query(
        `CREATE INDEX IF NOT EXISTS vegas_accusations_story_idx ON vegas_accusations (story_id);`,
      );
    })();
  }
  return schemaReady;
}

export interface AccusationRow {
  story_id: string;
  session_id: string;
  accused_id: string;
  accused_name: string;
  culprit_id: string;
  correct: boolean;
  evidence: string[];
}

export interface StoryStats {
  totalAccusations: number;
  correctPct: number;
  distribution: Array<{
    accused_id: string;
    accused_name: string;
    count: number;
    pct: number;
    isCulprit: boolean;
  }>;
}

async function q<T extends QueryResultRow>(
  sql: string,
  args: unknown[],
): Promise<QueryResult<T>> {
  await ensureSchema();
  return getPool().query<T>(sql, args);
}

export async function recordAccusation(row: AccusationRow): Promise<void> {
  await q(
    `INSERT INTO vegas_accusations
      (story_id, session_id, accused_id, accused_name, culprit_id, correct, evidence)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (session_id) DO NOTHING`,
    [
      row.story_id,
      row.session_id,
      row.accused_id,
      row.accused_name,
      row.culprit_id,
      row.correct,
      row.evidence,
    ],
  );
}

export async function getStats(
  storyId: string,
  suspects: Array<{ id: string; name: string; isCulprit: boolean }>,
): Promise<StoryStats> {
  const total = await q<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM vegas_accusations WHERE story_id = $1`,
    [storyId],
  );
  const correct = await q<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM vegas_accusations WHERE story_id = $1 AND correct = TRUE`,
    [storyId],
  );
  const dist = await q<{ accused_id: string; accused_name: string; c: string }>(
    `SELECT accused_id, accused_name, COUNT(*)::text AS c
     FROM vegas_accusations
     WHERE story_id = $1
     GROUP BY accused_id, accused_name
     ORDER BY COUNT(*) DESC`,
    [storyId],
  );

  const totalNum = Number(total.rows[0]?.count ?? 0);
  const correctNum = Number(correct.rows[0]?.count ?? 0);
  const correctPct = totalNum === 0 ? 0 : Math.round((correctNum / totalNum) * 100);

  const byId = new Map(suspects.map((s) => [s.id, s]));
  const distribution = dist.rows.map((r) => {
    const count = Number(r.c);
    return {
      accused_id: r.accused_id,
      accused_name: byId.get(r.accused_id)?.name ?? r.accused_name,
      count,
      pct: totalNum === 0 ? 0 : Math.round((count / totalNum) * 100),
      isCulprit: byId.get(r.accused_id)?.isCulprit ?? false,
    };
  });

  // Add zero-count suspects so the UI shows the full slate
  for (const s of suspects) {
    if (!distribution.find((d) => d.accused_id === s.id)) {
      distribution.push({
        accused_id: s.id,
        accused_name: s.name,
        count: 0,
        pct: 0,
        isCulprit: s.isCulprit,
      });
    }
  }

  return {
    totalAccusations: totalNum,
    correctPct,
    distribution,
  };
}
