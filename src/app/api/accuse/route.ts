import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session-store";
import { getStory } from "@/lib/stories/registry";
import { recordAccusation, getStats } from "@/lib/stats-db";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, accused_id, evidence } = body as {
      session_id?: string;
      accused_id?: string;
      evidence?: string[];
    };

    if (!session_id || !accused_id) {
      return NextResponse.json(
        { error: "session_id and accused_id required" },
        { status: 400 },
      );
    }

    const session = await getSession(session_id);
    if (!session?.storyId) {
      return NextResponse.json({ error: "session not found" }, { status: 404 });
    }

    const story = getStory(session.storyId);
    if (!story?.solution) {
      return NextResponse.json(
        { error: "story has no canonical solution" },
        { status: 500 },
      );
    }

    const suspect = story.solution.suspects.find((s) => s.id === accused_id);
    if (!suspect) {
      return NextResponse.json({ error: "unknown suspect" }, { status: 400 });
    }

    const correct = suspect.isCulprit;

    try {
      await recordAccusation({
        story_id: session.storyId,
        session_id,
        accused_id,
        accused_name: suspect.name,
        culprit_id: story.solution.culpritId,
        correct,
        evidence: Array.isArray(evidence) ? evidence.slice(0, 10) : [],
      });
    } catch (dbErr) {
      // Don't block the verdict if stats write fails; log for follow-up.
      console.warn("[accuse] stats write failed:", dbErr);
    }

    // Fetch aggregated stats for the reveal screen.
    let stats;
    try {
      stats = await getStats(
        session.storyId,
        story.solution.suspects.map((s) => ({
          id: s.id,
          name: s.name,
          isCulprit: s.isCulprit,
        })),
      );
    } catch {
      stats = {
        totalAccusations: 0,
        correctPct: 0,
        distribution: story.solution.suspects.map((s) => ({
          accused_id: s.id,
          accused_name: s.name,
          count: 0,
          pct: 0,
          isCulprit: s.isCulprit,
        })),
      };
    }

    return NextResponse.json({
      correct,
      accused: { id: accused_id, name: suspect.name, blurb: suspect.blurb },
      culprit: {
        id: story.solution.culpritId,
        name: story.solution.culpritName,
      },
      reveal: {
        title: story.solution.revealTitle,
        body: story.solution.revealBody,
        keyEvidence: story.solution.keyEvidence,
      },
      question: story.solution.question,
      stats,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
