"use client";
/**
 * components/MarkdownToast.tsx
 * Animated toast notification when a new flash markdown appears in the marketplace.
 * Uses framer-motion for slide-in/out animation.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Zap, X } from "lucide-react";

interface MarkdownToastProps {
  message: string;
  discountPct: number;
  remainingHours: number;
  onClose: () => void;
}

export function MarkdownToast({
  message,
  discountPct,
  remainingHours,
  onClose,
}: MarkdownToastProps) {
  const urgencyColor = discountPct >= 45 ? "#ef4444" : discountPct >= 28 ? "#f59e0b" : "#6366f1";

  return (
    <AnimatePresence>
      <motion.div
        id="flash-markdown-toast"
        className="toast"
        initial={{ opacity: 0, x: 100, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 100, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        style={{ borderColor: urgencyColor + "66" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Zap size={16} color={urgencyColor} />
            <span style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>
              Flash Markdown!
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", padding: 0 }}
          >
            <X size={14} />
          </button>
        </div>

        <p style={{ margin: "0 0 8px 0", fontSize: 13, color: "#cbd5e1" }}>
          {message}
        </p>

        <div style={{ display: "flex", gap: 8 }}>
          <span
            style={{
              background: urgencyColor + "22",
              color: urgencyColor,
              border: `1px solid ${urgencyColor}44`,
              padding: "2px 10px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            -{discountPct}%
          </span>
          <span style={{ fontSize: 12, color: "#64748b", alignSelf: "center" }}>
            {Math.floor(remainingHours)}h freshness left
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
