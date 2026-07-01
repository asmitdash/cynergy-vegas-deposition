import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session-store";
import { remember } from "@/lib/cognee";
import type { WitnessId } from "@/lib/night-script";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      session_id,
      witness_id,
      claim_text,
      question,
    } = body as {
      session_id: string;
      witness_id: WitnessId;
      claim_text: string;
      question?: string;
    };

    if (!session_id || !witness_id || !claim_text) {
      return NextResponse.json(
        { error: "session_id, witness_id, claim_text required" },
        { status: 400 },
      );
    }

    const session = await getSession(session_id);
    if (!session || !session.caseDatasetId) {
      return NextResponse.json({ error: "session not found" }, { status: 404 });
    }

    const turnId = `t_${Date.now()}`;
    const claimBody =
      `# Pinned testimony from ${witness_id}\n\n` +
      (question ? `Detective asked: ${question}\n\n` : "") +
      `Witness said:\n> ${claim_text}`;

    const result = await remember({
      data: { text: claimBody, filename: `pinned-${turnId}.md` },
      datasetId: session.caseDatasetId,
      nodeSet: [
        `session_id:${session_id}`,
        `witness_id:${witness_id}`,
        `turn_id:${turnId}`,
        "kind:testimony",
        "kind:pinned",
      ],
      runInBackground: false,
    });

    return NextResponse.json({
      turn_id: turnId,
      witness_id,
      status: result.status,
      items_processed: result.items_processed,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
