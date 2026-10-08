"use client";
/**
 * components/AIInsightCard.tsx
 * Displays the AI insight block on the shipment detail page.
 */

import { Brain, Sparkles } from "lucide-react";

interface AIInsightCardProps {
  insight: string;
}

export function AIInsightCard({ insight }: AIInsightCardProps) {
  // If pipeline appended " | AI: ", just show the AI part
  const displayInsight = insight.includes(" | AI: ")
    ? insight.split(" | AI: ")[1]
    : insight;

  return (
    <div
      className="glass-card"
      style={{
        padding: 24,
        background: "rgba(99, 102, 241, 0.05)",
        border: "1px solid rgba(99, 102, 241, 0.2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <div
          style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            padding: 10,
            borderRadius: 10,
            boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
          }}
        >
          <Brain size={20} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#e2e8f0" }}>
            AI Insight
          </div>

        </div>
      </div>
      <p style={{ margin: 0, fontSize: 14, color: "#cbd5e1", lineHeight: 1.7, fontStyle: "italic" }}>
        &ldquo;{displayInsight}&rdquo;
      </p>
    </div>
  );
}
