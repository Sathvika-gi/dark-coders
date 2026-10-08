"use client";
/**
 * components/Navbar.tsx
 * Global navigation bar — shows role badge and logout.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Thermometer } from "lucide-react";

interface NavbarProps {
  role: "distributor" | "retailer";
}

export function Navbar({ role }: NavbarProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <nav className="navbar px-6 py-3 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div
          style={{
            background: "linear-gradient(135deg,#10b981,#059669)",
            borderRadius: 10,
            padding: "6px 8px",
            display: "flex",
          }}
        >
          <Thermometer size={18} color="white" />
        </div>
        <span style={{ fontWeight: 700, fontSize: 18, color: "#f1f5f9" }}>
          Agro<span style={{ color: "#10b981" }}>Sense</span>
        </span>
      </div>

      {/* Right: role badge + logout */}
      <div className="flex items-center gap-3">
        <span
          className={role === "distributor" ? "badge-info" : "badge-fresh"}
          style={{
            padding: "4px 12px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            textTransform: "capitalize",
          }}
        >
          {role === "distributor" ? "📦 Distributor" : "🏪 Retailer"}
        </span>
        <button
          id="logout-btn"
          className="btn btn-ghost"
          style={{ padding: "7px 14px", gap: 6 }}
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <LogOut size={14} />
          {loggingOut ? "..." : "Logout"}
        </button>
      </div>
    </nav>
  );
}
