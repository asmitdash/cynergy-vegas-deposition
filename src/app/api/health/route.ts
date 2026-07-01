import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    project: "vegas-deposition",
    cognee: process.env.COGNEE_BASE_URL ? "configured" : "missing",
    bedrock: process.env.AWS_ACCESS_KEY_ID ? "configured" : "missing",
    upstash: process.env.UPSTASH_REDIS_REST_URL ? "configured" : "in-memory fallback",
    model: process.env.BEDROCK_MODEL_ID ?? "global.anthropic.claude-opus-4-7[1m]",
  });
}
