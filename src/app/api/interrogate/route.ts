import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session-store";
import { recall } from "@/lib/cognee";
import { callOpus } from "@/lib/bedrock";
import { getStory } from "@/lib/stories/registry";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, witness_id, question } = body as {
      session_id: string;
      witness_id: string;
      question: string;
    };

    if (!session_id || !witness_id || !question) {
      return NextResponse.json(
        { error: "session_id, witness_id, question required" },
        { status: 400 },
      );
    }

    const session = await getSession(session_id);
    if (!session) {
      return NextResponse.json({ error: "session not found" }, { status: 404 });
    }
    if (!session.caseDatasetId) {
      return NextResponse.json({ error: "session has no dataset" }, { status: 500 });
    }
    if (!session.storyId) {
      return NextResponse.json({ error: "session has no story_id" }, { status: 500 });
    }

    const story = getStory(session.storyId);
    if (!story) {
      return NextResponse.json({ error: "story not found" }, { status: 404 });
    }
    const persona = story.witnesses.find((w) => w.id === witness_id);
    if (!persona) {
      return NextResponse.json({ error: "unknown witness for this story" }, { status: 400 });
    }

    // 1. Retrieve THIS witness's private memory only, using node_set as firewall.
    const results = await recall({
      query: question,
      datasetIds: [session.caseDatasetId],
      searchType: "GRAPH_COMPLETION",
      nodeName: [`witness_id:${witness_id}`, `session_id:${session_id}`],
      nodeNameFilterOperator: "AND",
      topK: 8,
      onlyContext: false,
      includeReferences: true,
    });

    const context = results
      .map((r, i) => `[chunk ${i + 1}] ${r.text}`)
      .join("\n\n") || "(no memory retrieved)";

    // 2. Persona reply via Bedrock Opus 4.7.
    const opus = await callOpus({
      system: persona.personaSystemPrompt,
      messages: [
        {
          role: "user",
          content: `CONTEXT (your own memory only):\n${context}\n\nDETECTIVE'S QUESTION:\n${question}\n\nYour answer, in character:`,
        },
      ],
      maxTokens: 512,
    });

    return NextResponse.json({
      witness: witness_id,
      display_name: persona.displayName,
      answer: opus.text,
      references: results.map((r) => ({
        source: r.source,
        search_type: r.search_type,
        text: r.text,
      })),
      tokens: { input: opus.inputTokens, output: opus.outputTokens },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
