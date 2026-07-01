import { NextResponse } from "next/server";
import { activeSessionCount, createSession, CONCURRENCY_LIMIT } from "@/lib/session-store";
import { createDataset, remember } from "@/lib/cognee";
import { NIGHT_EVENTS, eventsForWitness, type WitnessId } from "@/lib/night-script";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";
export const maxDuration = 60;

const WITNESSES: WitnessId[] = ["groom", "bestman", "security", "chapel"];

export async function POST() {
  try {
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
    const caseDataset = await createDataset(`vegas-case-${sessionId}`);

    // 3. Preload each witness's private memory as data items in the case dataset.
    //    We use node_set tags to isolate witness memories within the same dataset,
    //    which we then filter on at recall time.
    const preloadResults = await Promise.allSettled(
      WITNESSES.map((w) =>
        remember({
          data: {
            text: eventsForWitness(w),
            filename: `witness-${w}.md`,
          },
          datasetId: caseDataset.id,
          nodeSet: [
            `session_id:${sessionId}`,
            `witness_id:${w}`,
            "kind:preload",
            "kind:witness_memory",
          ],
          runInBackground: true, // don't block the response; cognify happens in background
        }),
      ),
    );

    await createSession(sessionId, caseDataset.id);

    return NextResponse.json({
      session_id: sessionId,
      dataset_id: caseDataset.id,
      dataset_name: caseDataset.name,
      preload: preloadResults.map((r, i) => ({
        witness: WITNESSES[i],
        status: r.status,
        result: r.status === "fulfilled" ? r.value.status : String(r.reason),
      })),
      event_count: NIGHT_EVENTS.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
