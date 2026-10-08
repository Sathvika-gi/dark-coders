"use client";
/**
 * components/AIInsightCard.tsx
 * Displays the AI-generated insight for a shipment.
 */

import { Brain, Sparkles } from "lucide-react";

interface AIInsightCardProps {
  insight: string;
  usedFallback?: boolean;
}

export function AIInsightCard({ insight, usedFallback }: AIInsightCardProps) {
  return (
    <div
      className="glass-card"
      style={{
        padding: 20,
        background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.05))",
        borderColor: "rgba(99,102,241,0.2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div
          style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            borderRadius: 8,
            padding: "5px 6px",
            display: "flex",
          }}
        >
          <Brain size={15} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>
            AI Insight
          </div>
          <div style={{ fontSize: 11, color: "#6366f1", display: "flex", alignItems: "center", gap: 3 }}>
            <Sparkles size={9} />
            {usedFallback ? "Template response" : "Claude Sonnet"}
          </div>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 14, color: "#cbd5e1", lineHeight: 1.7, fontStyle: "italic" }}>
        &ldquo;{insight}&rdquo;
      </p>
    </div>
  );
}
