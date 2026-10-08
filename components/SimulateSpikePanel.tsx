"use client";
/**
 * components/SimulateSpikePanel.tsx
 * Panel for distributors to trigger simulated telemetry on a shipment.
 * Shows step-by-step progress animation while readings are being posted.
 */

import { useState } from "react";
import { Zap, Activity, RefreshCw, CheckCircle } from "lucide-react";

interface SimulateSpikeProps {
  shipmentId: string;
  onComplete: () => void;
}

type Step = { label: string; done: boolean; active: boolean };

export function SimulateSpikePanel({ shipmentId, onComplete }: SimulateSpikeProps) {
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [result, setResult] = useState<{
    remaining: number; tier: string; discount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  async function runScenario(scenario: "normal" | "spike") {
    setLoading(true);
    setError(null);
    setResult(null);

    // Animated steps
    const scenarioSteps =
      scenario === "spike"
        ? [
            "Generating 19 temperature spike readings at 38°C…",
            "Posting telemetry batch to pipeline…",
            "Computing Q10 burn rates…",
            "Running pricing engine…",
            "Creating alert + markdown listing…",
            "Requesting AI insight (async)…",
          ]
        : [
            "Generating 10 normal readings…",
            "Posting telemetry batch…",
            "Computing burn rates…",
            "Checking pricing thresholds…",
          ];

    setSteps(scenarioSteps.map((label, i) => ({ label, done: false, active: i === 0 })));

    // Advance steps with delays for visual effect
    for (let i = 0; i < scenarioSteps.length - 1; i++) {
      await delay(400);
      setSteps((prev) =>
        prev.map((s, idx) => ({
          ...s,
          done: idx <= i,
          active: idx === i + 1,
        }))
      );
    }

    // Make the real API call
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipment_id: shipmentId, scenario }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Simulation failed");

      // Mark all done
      setSteps((prev) => prev.map((s) => ({ ...s, done: true, active: false })));

      setResult({
        remaining: data.remaining_life_hours,
        tier: data.tier,
        discount: data.discount_pct,
      });

      onComplete();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function resetDemo() {
    setResetting(true);
    setError(null);
    setResult(null);
    setSteps([]);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reset failed");
      onComplete();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Zap size={18} color="#f59e0b" />
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Simulate Telemetry</h3>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <button
          id="btn-simulate-normal"
          className="btn btn-ghost"
          onClick={() => runScenario("normal")}
          disabled={loading || resetting}
          style={{ fontSize: 13 }}
        >
          <Activity size={14} />
          Normal Readings
        </button>
        <button
          id="btn-simulate-spike"
          className="btn btn-critical"
          onClick={() => runScenario("spike")}
          disabled={loading || resetting}
          style={{ fontSize: 13 }}
        >
          <Zap size={14} />
          Simulate Spike (38°C)
        </button>
        <button
          id="btn-demo-reset"
          className="btn btn-ghost"
          onClick={resetDemo}
          disabled={loading || resetting}
          style={{ fontSize: 13 }}
        >
          <RefreshCw size={14} className={resetting ? "spin" : ""} />
          {resetting ? "Resetting…" : "Reset Demo"}
        </button>
      </div>

      {/* Progress steps */}
      {steps.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {steps.map((step, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 10px",
                borderRadius: 8,
                background: step.active
                  ? "rgba(245,158,11,0.1)"
                  : step.done
                  ? "rgba(16,185,129,0.08)"
                  : "transparent",
                transition: "background 0.3s",
              }}
            >
              {step.done ? (
                <CheckCircle size={14} color="#10b981" />
              ) : step.active ? (
                <div
                  style={{
                    width: 14, height: 14, borderRadius: "50%",
                    border: "2px solid #f59e0b",
                    borderTopColor: "transparent",
                    animation: "spin 0.6s linear infinite",
                  }}
                />
              ) : (
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #334155" }} />
              )}
              <span style={{ fontSize: 13, color: step.done ? "#10b981" : step.active ? "#fbbf24" : "#64748b" }}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Result */}
      {result && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: result.tier === "critical"
              ? "rgba(239,68,68,0.1)"
              : result.tier === "warning"
              ? "rgba(245,158,11,0.1)"
              : "rgba(16,185,129,0.1)",
            border: `1px solid ${result.tier === "critical" ? "rgba(239,68,68,0.3)" : result.tier === "warning" ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.3)"}`,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: "#f1f5f9" }}>
            ✅ Simulation complete
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>
            Remaining: <strong style={{ color: result.tier === "critical" ? "#f87171" : "#fbbf24" }}>
              {result.remaining.toFixed(1)}h
            </strong>
            {result.discount > 0 && (
              <>
                {" "}· Discount: <strong style={{ color: "#f87171" }}>-{result.discount}%</strong>
                {" "}· Tier: <strong>{result.tier.toUpperCase()}</strong>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#f87171",
            fontSize: 13,
          }}
        >
          ❌ {error}
        </div>
      )}

      {/* Spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
