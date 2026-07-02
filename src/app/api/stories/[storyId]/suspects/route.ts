import { NextRequest, NextResponse } from "next/server";
import { getStory } from "@/lib/stories/registry";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ storyId: string }> },
) {
  const { storyId } = await ctx.params;
  const story = getStory(storyId);
  if (!story?.solution) {
    return NextResponse.json({ error: "no solution" }, { status: 404 });
  }
  return NextResponse.json({
    story_id: storyId,
    question: story.solution.question,
    suspects: story.solution.suspects.map((s) => ({
      id: s.id,
      name: s.name,
      blurb: s.blurb,
    })),
  });
}
