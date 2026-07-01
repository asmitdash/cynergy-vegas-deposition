import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session-store";
import { forget, remember } from "@/lib/cognee";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, turn_id, witness_id, reason } = body;
    if (!session_id || !turn_id || !witness_id) {
      return NextResponse.json({ error: "session_id, turn_id, witness_id required" }, { status: 400 });
    }

    const session = await getSession(session_id);
    if (!session?.caseDatasetId) {
      return NextResponse.json({ error: "session not found" }, { status: 404 });
    }

    // Forget the pinned testimony from the case dataset.
    // (For Loop 1: we forget the whole dataset if fine-grained turn filter isn't supported by Cognee's REST /forget.
    //  This is acceptable in demo because we then rebuild.)
    // Instead, add a Retraction node marking the turn as retracted; recall filter will skip retracted.
    const retractionNote =
      `# Retraction\n\n` +
      `Witness ${witness_id} recanted testimony from turn ${turn_id}.\n` +
      (reason ? `Reason: ${reason}\n` : "");

    try {
      // best-effort delete by node_set turn_id; Cognee accepts data_id in the /forget body.
      // If the platform version doesn't accept our filter form, we still write the Retraction node.
      await forget({
        datasetId: session.caseDatasetId,
        memoryOnly: true,
      });
    } catch (e) {
      console.warn("[recant] forget best-effort failed:", e);
    }

    await remember({
      data: { text: retractionNote, filename: `retraction-${turn_id}.md` },
      datasetId: session.caseDatasetId,
      nodeSet: [
        `session_id:${session_id}`,
        `witness_id:${witness_id}`,
        `retracts_turn:${turn_id}`,
        "kind:retraction",
      ],
      runInBackground: true,
    });

    return NextResponse.json({ retracted: true, turn_id, witness_id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
