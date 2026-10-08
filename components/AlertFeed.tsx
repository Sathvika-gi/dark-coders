"use client";
/**
 * components/AlertFeed.tsx
 * Live alert feed — renders severity-colored alert rows.
 */

import { AlertTriangle, Info, AlertCircle } from "lucide-react";

interface Alert {
  id: string;
  severity: "info" | "warning" | "critical";
  message: string;
  created_at: string;
  shipments?: { code: string; produce_type: string };
}

interface AlertFeedProps {
  alerts: Alert[];
}

const SEVERITY_CONFIG = {
  info:     { icon: Info,          cls: "badge-info",     color: "#a5b4fc" },
  warning:  { icon: AlertTriangle, cls: "badge-warning",  color: "#fbbf24" },
  critical: { icon: AlertCircle,   cls: "badge-critical", color: "#f87171" },
};

function timeAgo(ts: string): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function AlertFeed({ alerts }: AlertFeedProps) {
  if (!alerts.length) {
    return (
      <div
        style={{
          textAlign: "center",
          color: "#475569",
          padding: "24px 0",
          fontSize: 14,
        }}
      >
        ✅ No alerts — all shipments healthy
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {alerts.map((alert) => {
        const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
        const Icon = cfg.icon;
        return (
          <div
            key={alert.id}
            id={`alert-${alert.id}`}
            className="glass-card-sm"
            style={{
              padding: "10px 14px",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              borderLeft: `3px solid ${cfg.color}`,
            }}
          >
            <Icon size={14} color={cfg.color} style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.4 }}>
                {alert.message}
              </div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>
                {alert.shipments?.code && (
                  <span style={{ color: "#64748b", marginRight: 6 }}>
                    {alert.shipments.code}
                  </span>
                )}
                {timeAgo(alert.created_at)}
              </div>
            </div>
            <span
              className={cfg.cls}
              style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600, flexShrink: 0 }}
            >
              {alert.severity.toUpperCase()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
