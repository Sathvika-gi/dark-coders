"use client";
/**
 * app/(auth)/login/page.tsx
 * Split-screen login — product pitch on left, two role cards on right.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Thermometer, Package, Store, Shield, TrendingDown, Clock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<"distributor" | "retailer" | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!selectedRole) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      router.push(selectedRole === "distributor" ? "/dashboard" : "/marketplace");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "linear-gradient(135deg, #0b0f1a 0%, #0d1630 60%, #0b1520 100%)",
      }}
    >
      {/* Left — hero */}
      <div
        style={{
          flex: 1,
          padding: "60px 48px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
          <div
            style={{
              background: "linear-gradient(135deg,#10b981,#059669)",
              borderRadius: 14,
              padding: "10px 12px",
              boxShadow: "0 4px 24px rgba(16,185,129,0.4)",
            }}
          >
            <Thermometer size={28} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 28, color: "#f1f5f9" }}>
            Agro<span style={{ color: "#10b981" }}>Sense</span>
          </span>
        </div>

        <h1
          style={{
            fontSize: 42,
            fontWeight: 800,
            color: "#f1f5f9",
            lineHeight: 1.2,
            marginBottom: 16,
          }}
        >
          Stop losing produce to
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, #10b981, #6366f1)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            temperature failures
          </span>
        </h1>

        <p style={{ fontSize: 17, color: "#94a3b8", lineHeight: 1.7, marginBottom: 40, maxWidth: 420 }}>
          Real-time cold-chain telemetry, Q10 shelf-life modeling, and AI-powered
          markdown discounts — so every kilogram reaches a retailer, not the trash.
        </p>

        {/* Feature pills */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { icon: Shield, text: "Append-only telemetry log — tamper-proof audit trail", color: "#10b981" },
            { icon: TrendingDown, text: "Dynamic markdowns published before produce spoils", color: "#f59e0b" },
            { icon: Clock, text: "AI insight in seconds — reroute before it's too late", color: "#6366f1" },
          ].map(({ icon: Icon, text, color }) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  background: color + "22",
                  border: `1px solid ${color}44`,
                  borderRadius: 8,
                  padding: 8,
                }}
              >
                <Icon size={16} color={color} />
              </div>
              <span style={{ color: "#cbd5e1", fontSize: 14 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — login */}
      <div
        style={{
          width: 440,
          padding: "60px 40px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: "#f1f5f9" }}>
          Sign in to AgroSense
        </h2>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 32 }}>
          Choose your role to continue
        </p>

        {/* Role cards */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
          {([
            {
              role: "distributor" as const,
              icon: Package,
              label: "Distributor",
              desc: "Monitor shipments & manage discounts",
              color: "#10b981",
            },
            {
              role: "retailer" as const,
              icon: Store,
              label: "Retailer",
              desc: "Browse live markdown listings",
              color: "#6366f1",
            },
          ] as const).map(({ role, icon: Icon, label, desc, color }) => (
            <button
              key={role}
              id={`role-${role}`}
              onClick={() => setSelectedRole(role)}
              style={{
                flex: 1,
                padding: "16px 12px",
                borderRadius: 14,
                border: `2px solid ${selectedRole === role ? color : "rgba(255,255,255,0.08)"}`,
                background: selectedRole === role ? color + "15" : "rgba(255,255,255,0.04)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.18s",
                boxShadow: selectedRole === role ? `0 0 20px ${color}22` : "none",
              }}
            >
              <div
                style={{
                  background: selectedRole === role ? color + "33" : "rgba(255,255,255,0.06)",
                  borderRadius: 8,
                  padding: 8,
                  display: "inline-flex",
                  marginBottom: 8,
                }}
              >
                <Icon size={18} color={selectedRole === role ? color : "#64748b"} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: selectedRole === role ? color : "#e2e8f0", marginBottom: 4 }}>
                {label}
              </div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>{desc}</div>
            </button>
          ))}
        </div>

        {/* Password */}
        {selectedRole && (
          <>
            <label style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8, display: "block" }}>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="input"
              placeholder={`Enter ${selectedRole} password`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              style={{ marginBottom: 16 }}
              autoFocus
            />
          </>
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
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          id="login-submit"
          className={`btn btn-${selectedRole === "distributor" ? "primary" : "primary"}`}
          onClick={handleLogin}
          disabled={!selectedRole || !password || loading}
          style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "13px" }}
        >
          {loading ? "Signing in…" : `Sign in as ${selectedRole ?? "…"}`}
        </button>

        <p style={{ textAlign: "center", fontSize: 12, color: "#334155", marginTop: 24 }}>
          AgroSense · AgriTech Cold Chain Monitor
        </p>
      </div>
    </div>
  );
}
