import { NextRequest, NextResponse } from "next/server";
import { activeSessionCount, createSession, CONCURRENCY_LIMIT } from "@/lib/session-store";
import { createDataset, remember } from "@/lib/cognee";
import { getStory } from "@/lib/stories/registry";
import { eventsMarkdownForWitness } from "@/lib/stories/types";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const storyId: string = body.story_id ?? "hangover";
    const story = getStory(storyId);
    if (!story) {
      return NextResponse.json(
        { error: "unknown story_id", story_id: storyId },
        { status: 404 },
      );
    }

    // 1. Concurrency check.
    const count = await activeSessionCount();
    if (count >= CONCURRENCY_LIMIT) {
      return NextResponse.json(
        {
          error: "at capacity",
          active: count,
          limit: CONCURRENCY_LIMIT,
          message: "Too many concurrent investigations. Try again in a few minutes.",
        },
        { status: 429 },
      );
    }

    // 2. Fresh session id + Cognee dataset for this case.
    const sessionId = uuidv4();
    const caseDataset = await createDataset(`vegas-case-${storyId}-${sessionId}`);

    // 3. Preload each witness's private memory as data items in the case dataset.
    //    node_set tags isolate witness memories within the same dataset,
    //    which we then filter on at recall time.
    const preloadResults = await Promise.allSettled(
      story.witnesses.map((w) =>
        remember({
          data: {
            text: eventsMarkdownForWitness(story, w.id),
            filename: `witness-${w.id}.md`,
          },
          datasetId: caseDataset.id,
          nodeSet: [
            `session_id:${sessionId}`,
            `story_id:${storyId}`,
            `witness_id:${w.id}`,
            "kind:preload",
            "kind:witness_memory",
          ],
          runInBackground: true,
        }),
      ),
    );

    await createSession(sessionId, caseDataset.id, storyId);

    return NextResponse.json({
      session_id: sessionId,
      story_id: storyId,
      story_title: story.title,
      dataset_id: caseDataset.id,
      dataset_name: caseDataset.name,
      witness_count: story.witnesses.length,
      event_count: story.events.length,
      preload: preloadResults.map((r, i) => ({
        witness: story.witnesses[i].id,
        status: r.status,
        result: r.status === "fulfilled" ? r.value.status : String(r.reason),
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
