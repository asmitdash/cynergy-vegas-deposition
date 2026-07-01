"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface WitnessInfo {
  id: string;
  displayName: string;
  teaser: string;
}

interface SessionInfo {
  session_id: string;
  story_id: string | null;
  story_title: string | null;
  story_tagline: string | null;
  witnesses: WitnessInfo[];
  expires_at: string;
}

interface Msg {
  role: "detective" | "witness";
  witness?: string;
  displayName?: string;
  text: string;
  turnId?: string;
  pinned?: boolean;
}

export default function CasePage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, Msg[]>>({});
  const [pending, setPending] = useState(false);
  const [question, setQuestion] = useState("");

  useEffect(() => {
    fetch(`/api/session/${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        setInfo(data);
        const initial: Record<string, Msg[]> = {};
        (data.witnesses ?? []).forEach((w: WitnessInfo) => (initial[w.id] = []));
        setThreads(initial);
      })
      .finally(() => setLoadingInfo(false));
  }, [sessionId]);

  const witnessBy = (id: string) => info?.witnesses.find((w) => w.id === id);

  async function ask() {
    if (!selected || !question.trim() || pending) return;
    const q = question.trim();
    setQuestion("");
    setThreads((t) => ({
      ...t,
      [selected]: [...(t[selected] ?? []), { role: "detective", text: q }],
    }));
    setPending(true);
    try {
      const res = await fetch("/api/interrogate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, witness_id: selected, question: q }),
      });
      const body = await res.json();
      const answer = res.ok ? body.answer : `(system) ${body.error || "no reply"}`;
      const displayName = res.ok ? body.display_name : witnessBy(selected)?.displayName;
      setThreads((t) => ({
        ...t,
        [selected]: [...(t[selected] ?? []), { role: "witness", witness: selected, displayName, text: answer }],
      }));
    } finally {
      setPending(false);
    }
  }

  async function pin(msg: Msg) {
    if (!selected || !msg.text) return;
    const res = await fetch("/api/testimony/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        witness_id: selected,
        claim_text: msg.text,
      }),
    });
    if (res.ok) {
      const body = await res.json();
      setThreads((t) => ({
        ...t,
        [selected]: (t[selected] ?? []).map((m) => (m === msg ? { ...m, pinned: true, turnId: body.turn_id } : m)),
      }));
    }
  }

  if (loadingInfo) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="mono" style={{ color: "var(--text-muted)" }}>Loading case…</div>
      </main>
    );
  }

  if (!info?.story_id) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div className="mono" style={{ color: "var(--contradiction)" }}>Session not found or expired.</div>
        <Link href="/" className="btn btn-primary">Back to case files</Link>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Link href="/" className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 11 }}>← Cases</Link>
        <span className="mono" style={{ fontSize: 12, color: "var(--warm-amber)" }}>
          {info.story_title} · #{sessionId.slice(0, 8)}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Link href={`/case/${sessionId}/graph`} className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 11 }}>Graph</Link>
          <Link href={`/case/${sessionId}/contradictions`} className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 11 }}>Contradictions</Link>
        </div>
      </header>

      {!selected ? (
        <div style={{ padding: 24, display: "grid", gap: 12, maxWidth: 720, margin: "40px auto 0", width: "100%" }}>
          {info.story_tagline && (
            <p className="serif" style={{ fontStyle: "italic", color: "var(--text-muted)", fontSize: 16, marginBottom: 12, lineHeight: 1.5 }}>
              {info.story_tagline}
            </p>
          )}
          <h2 className="serif" style={{ fontSize: 28, marginBottom: 4 }}>Select a witness to interrogate.</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 16, fontSize: 14 }}>
            Each witness has their own private memory. Nothing they say is grounded outside their slice of the story.
          </p>
          {info.witnesses.map((w) => (
            <button
              key={w.id}
              className="card"
              onClick={() => setSelected(w.id)}
              style={{ textAlign: "left", cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
                <span className="chip">{w.displayName}</span>
                {(threads[w.id]?.length ?? 0) > 0 && <span className="chip">{threads[w.id].length} exchanges</span>}
              </div>
              <p className="serif" style={{ fontStyle: "italic", color: "var(--text-muted)", fontSize: 15 }}>
                &ldquo;{w.teaser}&rdquo;
              </p>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 720, width: "100%", margin: "0 auto", padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 11 }} onClick={() => setSelected(null)}>
              ← Witnesses
            </button>
            <span className="chip">
              Interrogating: {witnessBy(selected)?.displayName}
            </span>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, marginBottom: 14, minHeight: 300 }}>
            {(threads[selected]?.length ?? 0) === 0 && (
              <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Ask your first question below.</p>
            )}
            {(threads[selected] ?? []).map((m, i) => (
              <div key={i} className={m.role === "witness" ? "msg-witness" : "msg-detective"}>
                <div className="mono" style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>
                  {m.role === "witness" ? (m.displayName ?? witnessBy(m.witness ?? "")?.displayName ?? m.witness) : "YOU"}
                </div>
                <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
                {m.role === "witness" && (
                  <div style={{ marginTop: 6 }}>
                    {m.pinned ? (
                      <span className="chip" style={{ color: "var(--evidence)", borderColor: "color-mix(in oklab, var(--evidence) 40%, transparent)" }}>
                        📌 pinned · {m.turnId}
                      </span>
                    ) : (
                      <button
                        onClick={() => pin(m)}
                        style={{ background: "transparent", border: "none", color: "var(--neon-cyan)", cursor: "pointer", fontSize: 12, padding: 0 }}
                      >
                        pin evidence →
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {pending && <div className="msg-witness"><span className="mono" style={{ fontSize: 12, opacity: 0.6 }}>...thinking...</span></div>}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask()}
              placeholder="Your question..."
            />
            <button className="btn btn-primary" disabled={!question.trim() || pending} onClick={ask}>
              Ask
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
