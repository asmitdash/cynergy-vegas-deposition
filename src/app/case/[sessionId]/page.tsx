"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { WitnessId } from "@/lib/night-script";

const WITNESSES: { id: WitnessId; display: string; teaser: string; chip: string }[] = [
  { id: "groom", display: "The Groom", teaser: "I woke up in a bathtub. That's all I remember.", chip: "chip-groom" },
  { id: "bestman", display: "The Best Man", teaser: "He was fine at 2am. Then the calls stopped.", chip: "chip-bestman" },
  { id: "security", display: "Hotel Security AI", teaser: "Elevator logs show 47 anomalies that night.", chip: "chip-security" },
  { id: "chapel", display: "Chapel Bot", teaser: "Ceremony was scheduled 6am. No one arrived.", chip: "chip-chapel" },
];

interface Msg {
  role: "detective" | "witness";
  witness?: WitnessId;
  text: string;
  turnId?: string;
  pinned?: boolean;
}

export default function CasePage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const [selected, setSelected] = useState<WitnessId | null>(null);
  const [threads, setThreads] = useState<Record<WitnessId, Msg[]>>({
    groom: [], bestman: [], security: [], chapel: [],
  });
  const [pending, setPending] = useState(false);
  const [question, setQuestion] = useState("");

  async function ask() {
    if (!selected || !question.trim() || pending) return;
    const q = question.trim();
    setQuestion("");
    setThreads((t) => ({
      ...t,
      [selected]: [...t[selected], { role: "detective", text: q }],
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
      setThreads((t) => ({
        ...t,
        [selected]: [...t[selected], { role: "witness", witness: selected, text: answer }],
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
        [selected]: t[selected].map((m) => (m === msg ? { ...m, pinned: true, turnId: body.turn_id } : m)),
      }));
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
        <span className="mono" style={{ fontSize: 12, color: "var(--warm-amber)" }}>CASE #V · {sessionId.slice(0, 8)}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Link href={`/case/${sessionId}/graph`} className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 11 }}>Graph</Link>
          <Link href={`/case/${sessionId}/contradictions`} className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 11 }}>Contradictions</Link>
        </div>
      </header>

      {!selected ? (
        <div style={{ padding: 24, display: "grid", gap: 12, maxWidth: 640, margin: "40px auto 0", width: "100%" }}>
          <h2 className="serif" style={{ fontSize: 28, marginBottom: 4 }}>Select a witness to interrogate.</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>
            Each witness has their own private memory. Nothing they say is grounded outside their slice of the night.
          </p>
          {WITNESSES.map((w) => (
            <button
              key={w.id}
              className="card"
              onClick={() => setSelected(w.id)}
              style={{ textAlign: "left", cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                <span className={`chip ${w.chip}`}>{w.display}</span>
                {threads[w.id].length > 0 && <span className="chip">{threads[w.id].length} exchanges</span>}
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
              ← Back
            </button>
            <span className={`chip ${WITNESSES.find((w) => w.id === selected)!.chip}`}>
              Interrogating: {WITNESSES.find((w) => w.id === selected)!.display}
            </span>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, marginBottom: 14, minHeight: 300 }}>
            {threads[selected].length === 0 && (
              <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Ask your first question below.</p>
            )}
            {threads[selected].map((m, i) => (
              <div key={i} className={m.role === "witness" ? "msg-witness" : "msg-detective"}>
                <div className="mono" style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>
                  {m.role === "witness" ? WITNESSES.find((w) => w.id === m.witness)?.display : "YOU"}
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
