/**
 * Session state — Upstash Redis if configured, in-memory fallback for local dev.
 * Sessions are UUIDv7-style time-ordered IDs.
 * TTL enforced via Redis EX; in-memory falls back to setTimeout cleanup.
 */

import { Redis } from "@upstash/redis";

const ttlSeconds = (Number(process.env.FEATURE_SESSION_TTL_MINUTES) || 45) * 60;
const MAX_CONCURRENT = Number(process.env.FEATURE_MAX_CONCURRENT_SESSIONS) || 10;

type SessionMeta = {
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  caseDatasetId?: string;
  storyId?: string;
};

const useRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const redis = useRedis
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

const memoryStore = new Map<string, SessionMeta>();

export async function activeSessionCount(): Promise<number> {
  if (redis) {
    const keys = await redis.keys("vegas:session:*");
    return keys.length;
  }
  return memoryStore.size;
}

export async function createSession(sessionId: string, caseDatasetId?: string, storyId?: string): Promise<SessionMeta> {
  const now = new Date();
  const meta: SessionMeta = {
    sessionId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
    caseDatasetId,
    storyId,
  };
  if (redis) {
    await redis.set(`vegas:session:${sessionId}`, meta, { ex: ttlSeconds });
  } else {
    memoryStore.set(sessionId, meta);
    setTimeout(() => memoryStore.delete(sessionId), ttlSeconds * 1000);
  }
  return meta;
}

export async function getSession(sessionId: string): Promise<SessionMeta | null> {
  if (redis) {
    const val = await redis.get<SessionMeta>(`vegas:session:${sessionId}`);
    return val ?? null;
  }
  return memoryStore.get(sessionId) ?? null;
}

export async function updateCaseDataset(sessionId: string, caseDatasetId: string): Promise<void> {
  const existing = await getSession(sessionId);
  if (!existing) return;
  const meta: SessionMeta = { ...existing, caseDatasetId };
  if (redis) {
    await redis.set(`vegas:session:${sessionId}`, meta, { ex: ttlSeconds });
  } else {
    memoryStore.set(sessionId, meta);
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  if (redis) await redis.del(`vegas:session:${sessionId}`);
  else memoryStore.delete(sessionId);
}

export const CONCURRENCY_LIMIT = MAX_CONCURRENT;
