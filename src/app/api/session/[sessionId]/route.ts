import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session-store";
import { getStory } from "@/lib/stories/registry";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await ctx.params;
  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }
  const story = session.storyId ? getStory(session.storyId) : null;
  return NextResponse.json({
    session_id: sessionId,
    story_id: session.storyId ?? null,
    story_title: story?.title ?? null,
    story_tagline: story?.tagline ?? null,
    witnesses:
      story?.witnesses.map((w) => ({
        id: w.id,
        displayName: w.displayName,
        teaser: w.teaser,
      })) ?? [],
    dataset_id: session.caseDatasetId ?? null,
    expires_at: session.expiresAt,
  });
}
