import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session-store";
import { recall } from "@/lib/cognee";
import { callOpus } from "@/lib/bedrock";

export const runtime = "nodejs";
export const maxDuration = 60;

const CONTRADICTION_SYS = `You compare pinned witness testimonies and identify contradictions.

You will receive a set of TESTIMONIES pinned by the detective. Each testimony has a witness_id and a claim.

Return STRICT JSON — an array of contradiction objects:
[{ "a_witness": "groom", "b_witness": "security", "kind": "quantity|location|time|identity|causal|possession", "explanation": "one sentence", "severity": "hard|soft|temporal", "confidence": 0.0-1.0 }]

Rules:
- hard: same subject+predicate, incompatible objects, both confidence high
- soft: one witness is vague, one is specific
- temporal: same event, timestamps differ meaningfully
- Empty array if no contradictions. No prose.`;

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }
    const session = await getSession(sessionId);
    if (!session?.caseDatasetId) {
      return NextResponse.json({ contradictions: [] });
    }

    // Pull all pinned testimony via Cognee.
    const results = await recall({
      query: "list all pinned testimony pieces with witness attribution",
      datasetIds: [session.caseDatasetId],
      searchType: "GRAPH_COMPLETION_COT",
      nodeName: ["kind:pinned"],
      nodeNameFilterOperator: "AND",
      topK: 30,
      onlyContext: false,
      includeReferences: true,
    });

    if (results.length === 0) {
      return NextResponse.json({ contradictions: [], reason: "no pinned testimony yet" });
    }

    const testimonyBlock = results.map((r, i) => `[${i}] ${r.text}`).join("\n\n");

    const opus = await callOpus({
      system: CONTRADICTION_SYS,
      messages: [
        {
          role: "user",
          content: `TESTIMONIES:\n${testimonyBlock}\n\nReturn the JSON array of contradictions.`,
        },
      ],
      maxTokens: 1024,
    });

    let contradictions: unknown[] = [];
    const match = opus.text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        contradictions = JSON.parse(match[0]);
      } catch {
        contradictions = [];
      }
    }

    return NextResponse.json({ contradictions, tokens: { in: opus.inputTokens, out: opus.outputTokens } });
  } catch (e) {
    return NextResponse.json({ contradictions: [], error: e instanceof Error ? e.message : String(e) });
  }
}
