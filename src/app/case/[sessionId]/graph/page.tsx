"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

interface Node { id: string; label?: string; type?: string; }
interface Edge { source: string; target: string; relation?: string; }

export default function GraphPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const [graph, setGraph] = useState<{ nodes: Node[]; links: Edge[] }>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const r = await fetch(`/api/graph?session_id=${sessionId}`);
      const data = await r.json();
      setGraph({
        nodes: (data.nodes ?? []).map((n: Node) => ({ ...n, id: String(n.id) })),
        links: (data.edges ?? []).map((e: Edge) => ({
          source: String(e.source),
          target: String(e.target),
          relation: e.relation,
        })),
      });
      setLoading(false);
    };
    load();
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
  }, [sessionId]);

  const colorFor = (type?: string) => {
    switch (type) {
      case "Witness": case "Groom": return "#ff006e";
      case "BestMan": return "#ffb627";
      case "SecurityAI": return "#00d9ff";
      case "ChapelBot": return "#b185ff";
      case "Location": return "#00d9ff";
      case "Event": return "#ffb627";
      case "Retraction": return "#8a8f98";
      default: return "#e8eaed";
    }
  };

  return (
    <main style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: 12, borderBottom: "1px solid var(--border)", display: "flex", gap: 12 }}>
        <Link href={`/case/${sessionId}`} className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 11 }}>← Case</Link>
        <span className="mono" style={{ fontSize: 12, color: "var(--warm-amber)" }}>
          CASE GRAPH · {graph.nodes.length} nodes · {graph.links.length} edges
        </span>
      </header>
      <div style={{ flex: 1, background: "var(--bg-deep)" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
            Loading case graph from Cognee…
          </div>
        ) : graph.nodes.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: "var(--text-muted)" }}>
            <div className="serif" style={{ fontSize: 20 }}>The case is empty.</div>
            <div>Interrogate a witness and pin evidence to build the graph.</div>
          </div>
        ) : (
          <ForceGraph2D
            graphData={graph}
            backgroundColor="#0a0e1a"
            nodeColor={(n) => colorFor((n as Node).type)}
            nodeLabel={(n) => `${(n as Node).label ?? (n as Node).id} (${(n as Node).type ?? "?"})`}
            linkColor={() => "#2a2f3e"}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
          />
        )}
      </div>
    </main>
  );
}
