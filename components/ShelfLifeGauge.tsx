"use client";
/**
 * components/ShelfLifeGauge.tsx
 * Animated circular gauge showing remaining shelf life.
 * Color shifts fresh (green) → warning (amber) → critical (red).
 * Uses SVG with CSS transition so it "drains" smoothly.
 */

import { formatRemainingLife } from "@/lib/model";

interface ShelfLifeGaugeProps {
  remainingHours: number;
  initialHours: number;
  size?: number;
}

export function ShelfLifeGauge({
  remainingHours,
  initialHours,
  size = 140,
}: ShelfLifeGaugeProps) {
  const pct = Math.min(1, Math.max(0, remainingHours / initialHours));

  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = pct * circumference;
  const gap = circumference - dash;

  // Color: fresh → warning → critical
  let color = "#10b981"; // fresh
  if (pct < 0.2) color = "#ef4444";       // critical
  else if (pct < 0.4) color = "#f59e0b";  // warning

  const label = formatRemainingLife(remainingHours);

  return (
    <div
      style={{ width: size, height: size, position: "relative", flexShrink: 0 }}
      title={`${remainingHours.toFixed(1)}h of ${initialHours}h remaining`}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)" }}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={10}
        />
        {/* Fill — animates via CSS */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          style={{
            transition: "stroke-dasharray 0.8s ease, stroke 0.6s ease",
            filter: `drop-shadow(0 0 6px ${color}66)`,
          }}
        />
      </svg>

      {/* Center text */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 2,
        }}
      >
        <span style={{ fontSize: size < 100 ? 13 : 18, fontWeight: 700, color, lineHeight: 1 }}>
          {label}
        </span>
        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 500 }}>remaining</span>
      </div>
    </div>
  );
}
