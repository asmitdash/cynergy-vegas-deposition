import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session-store";
import { remember } from "@/lib/cognee";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Recant a specific turn.
 *
 * Soft-retract pattern: we DO NOT call forget() — that would nuke the entire
 * case dataset (including preloaded per-witness private memory and every
 * other pinned turn). Instead we write a Retraction note pinned to the same
 * dataset with node_set tags that identify the turn being retracted.
 * Contradiction detection and graph views can filter retracted claims by
 * looking for the matching `retracts_turn:<turn_id>` tag.
 *
 * runInBackground is false so the client only sees a success response after
 * the retraction is durably visible in the graph.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, turn_id, witness_id, reason } = body;
    if (!session_id || !turn_id || !witness_id) {
      return NextResponse.json(
        { error: "session_id, turn_id, witness_id required" },
        { status: 400 },
      );
    }

    const session = await getSession(session_id);
    if (!session?.caseDatasetId) {
      return NextResponse.json({ error: "session not found" }, { status: 404 });
    }

    const retractionNote =
      `# Retraction\n\n` +
      `Witness ${witness_id} recanted testimony from turn ${turn_id}.\n` +
      (reason ? `Reason: ${reason}\n` : "");

    await remember({
      data: { text: retractionNote, filename: `retraction-${turn_id}.md` },
      datasetId: session.caseDatasetId,
      nodeSet: [
        `retracts_turn:${turn_id}`,
        "kind:retraction",
        `session_id:${session_id}`,
        `witness_id:${witness_id}`,
      ],
      runInBackground: false,
    });

    return NextResponse.json({ retracted: true, turn_id, witness_id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
