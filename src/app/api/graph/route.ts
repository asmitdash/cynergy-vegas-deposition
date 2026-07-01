import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session-store";
import { exportGraph } from "@/lib/cognee";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }
    const session = await getSession(sessionId);
    if (!session || !session.caseDatasetId) {
      return NextResponse.json({ nodes: [], edges: [] });
    }
    const graph = await exportGraph(session.caseDatasetId);
    return NextResponse.json(graph);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ nodes: [], edges: [], error: msg }, { status: 200 });
  }
}
