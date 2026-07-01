"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Landing() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/session/start", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || body.message || "start failed");
      router.push(`/case/${body.session_id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ maxWidth: 640, textAlign: "center" }}>
        <div className="mono" style={{ fontSize: 12, color: "var(--warm-amber)", letterSpacing: "0.2em", marginBottom: 24 }}>
          VEGAS · 5:47 AM · CASE #V-2026-{new Date().toISOString().slice(2, 10).replace(/-/g, "")}
        </div>
        <h1 className="serif" style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.05, marginBottom: 24 }}>
          The groom never made it to the altar.
        </h1>
        <p className="serif" style={{ fontSize: 22, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 40, fontStyle: "italic" }}>
          Four witnesses. Four stories. One of them is lying.
        </p>
        <button className="btn btn-primary" onClick={start} disabled={loading} style={{ padding: "14px 28px", fontSize: 14 }}>
          {loading ? "Assembling case…" : "Begin Investigation"}
        </button>
        {err && (
          <div style={{ marginTop: 24, padding: 12, border: "1px solid var(--contradiction)", borderRadius: 8, color: "var(--contradiction)", fontSize: 14 }}>
            {err}
          </div>
        )}
        <div style={{ marginTop: 60, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <span className="chip">Cognee</span>
          <span className="chip">Bedrock Opus 4.7</span>
          <span className="chip">Multi-tenant</span>
          <span className="chip">4 witnesses · 5 SearchTypes</span>
        </div>
        <p className="mono" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 48 }}>
          Cynergy · WeMakeDevs × Cognee Hackathon
        </p>
      </div>
    </main>
  );
}
