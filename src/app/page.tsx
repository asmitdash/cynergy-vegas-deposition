"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface StoryCard {
  id: string;
  title: string;
  tagline: string;
  witnessCount: number;
  eventCount: number;
  inspiration: string;
}

export default function Landing() {
  const router = useRouter();
  const [stories, setStories] = useState<StoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stories")
      .then((r) => r.json())
      .then((d) => setStories(d.stories ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function start(storyId: string) {
    setSelecting(storyId);
    setErr(null);
    try {
      const res = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story_id: storyId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || body.message || "start failed");
      router.push(`/case/${body.session_id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSelecting(null);
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "40px 20px", maxWidth: 1080, margin: "0 auto" }}>
      <header style={{ textAlign: "center", marginBottom: 48 }}>
        <div className="mono" style={{ fontSize: 12, color: "var(--warm-amber)", letterSpacing: "0.2em", marginBottom: 16 }}>
          VEGAS DEPOSITION · CASE FILES
        </div>
        <h1 className="serif" style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.05, marginBottom: 16 }}>
          Pick a case. Interrogate the witnesses.
        </h1>
        <p className="serif" style={{ fontSize: 20, color: "var(--text-muted)", lineHeight: 1.5, fontStyle: "italic", maxWidth: 720, margin: "0 auto" }}>
          Every witness has private memory. Contradictions surface in the shared graph. Retract on click.
        </p>
        <div style={{ marginTop: 24, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <span className="chip">Cognee</span>
          <span className="chip">Bedrock Opus 4.7</span>
          <span className="chip">Multi-tenant</span>
          <span className="chip">{stories.length} cases</span>
        </div>
      </header>

      {err && (
        <div style={{ margin: "16px auto 32px", padding: 12, maxWidth: 640, border: "1px solid var(--contradiction)", borderRadius: 8, color: "var(--contradiction)", fontSize: 14 }}>
          {err}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", color: "var(--text-muted)" }}>Loading cases…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {stories.map((s) => (
            <button
              key={s.id}
              onClick={() => start(s.id)}
              disabled={selecting !== null}
              className="card"
              style={{
                textAlign: "left",
                cursor: selecting ? "wait" : "pointer",
                opacity: selecting && selecting !== s.id ? 0.4 : 1,
                display: "flex", flexDirection: "column", gap: 12,
              }}
            >
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="chip">{s.witnessCount} witnesses</span>
                <span className="chip">{s.eventCount} events</span>
              </div>
              <h2 className="serif" style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.2 }}>
                {s.title}
              </h2>
              <p className="serif" style={{ fontStyle: "italic", color: "var(--text-muted)", fontSize: 14, lineHeight: 1.5, flex: 1 }}>
                &ldquo;{s.tagline}&rdquo;
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <span className="mono" style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.6 }}>{s.inspiration}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--warm-amber)" }}>
                  {selecting === s.id ? "OPENING…" : "OPEN →"}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <footer style={{ marginTop: 60, textAlign: "center", color: "var(--text-muted)", fontSize: 11 }} className="mono">
        Cynergy · WeMakeDevs × Cognee Hackathon
      </footer>
    </main>
  );
}
