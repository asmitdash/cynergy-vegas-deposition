"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Contradiction {
  a_witness: string;
  b_witness: string;
  kind: string;
  explanation: string;
  severity: string;
  confidence: number;
}

export default function ContradictionsPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const [items, setItems] = useState<Contradiction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/contradictions?session_id=${sessionId}`);
      const body = await r.json();
      if (body.contradictions) setItems(body.contradictions);
      if (body.error) setError(body.error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [sessionId]);

  return (
    <main style={{ padding: 20, maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <Link href={`/case/${sessionId}`} className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 11 }}>← Case</Link>
        <h1 className="serif" style={{ fontSize: 28 }}>Contradictions</h1>
        <button className="btn btn-ghost" style={{ marginLeft: "auto", padding: "6px 12px", fontSize: 11 }} onClick={refresh}>Refresh</button>
      </div>

      {loading && <div style={{ color: "var(--text-muted)" }}>Analyzing pinned testimony…</div>}
      {error && <div style={{ color: "var(--contradiction)" }}>{error}</div>}

      {!loading && items.length === 0 && (
        <div className="card">
          <p style={{ color: "var(--text-muted)" }}>
            No contradictions detected yet. Pin testimony from at least two witnesses to build the case graph.
          </p>
        </div>
      )}

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {items.map((c, i) => (
          <div key={i} className="card" style={{ borderColor: "color-mix(in oklab, var(--contradiction) 40%, var(--border))" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <span className="chip chip-contradiction">{c.severity}</span>
              <span className="chip">{c.kind}</span>
              <span className={`chip chip-${c.a_witness}`}>{c.a_witness}</span>
              <span style={{ color: "var(--text-muted)" }}>vs</span>
              <span className={`chip chip-${c.b_witness}`}>{c.b_witness}</span>
              <span className="chip">{Math.round((c.confidence ?? 0) * 100)}%</span>
            </div>
            <p style={{ color: "var(--text-primary)" }}>{c.explanation}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
