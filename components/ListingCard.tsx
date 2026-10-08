"use client";
/**
 * components/ListingCard.tsx
 * Marketplace listing card with strikethrough original price, discount badge, and countdown.
 */

import { Clock, TrendingDown } from "lucide-react";
import { formatRemainingLife } from "@/lib/model";

interface Listing {
  id: string;
  retailer_message: string;
  original_price: number;
  discounted_price: number;
  discount_pct: number;
  remaining_life_hours: number;
  reason: string;
  created_at: string;
  shipments?: {
    code: string;
    produce_type: string;
    qty_kg: number;
    origin: string;
    destination: string;
  };
  isNew?: boolean;
}

interface ListingCardProps {
  listing: Listing;
}

const PRODUCE_EMOJI: Record<string, string> = {
  tomato: "🍅", banana: "🍌", spinach: "🥬", strawberry: "🍓",
};

export function ListingCard({ listing }: ListingCardProps) {
  const emoji = PRODUCE_EMOJI[listing.shipments?.produce_type ?? ""] ?? "📦";
  const urgencyColor =
    listing.discount_pct >= 45
      ? "#ef4444"
      : listing.discount_pct >= 28
      ? "#f59e0b"
      : "#6366f1";

  return (
    <div
      id={`listing-${listing.id}`}
      className="glass-card"
      style={{
        padding: 20,
        position: "relative",
        overflow: "hidden",
        borderColor: listing.isNew ? urgencyColor + "55" : undefined,
        boxShadow: listing.isNew ? `0 0 20px ${urgencyColor}22` : undefined,
      }}
    >
      {/* NEW badge */}
      {listing.isNew && (
        <div
          className="pulse-critical"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: urgencyColor,
            color: "white",
            fontSize: 10,
            fontWeight: 800,
            padding: "2px 8px",
            borderRadius: 10,
            letterSpacing: "0.05em",
          }}
        >
          NEW
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 32 }}>{emoji}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>
            {listing.shipments?.produce_type
              ? listing.shipments.produce_type.charAt(0).toUpperCase() +
                listing.shipments.produce_type.slice(1)
              : "Produce"}
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {listing.shipments?.code} · {listing.shipments?.qty_kg}kg · {listing.shipments?.origin}
          </div>
        </div>
      </div>

      {/* Price */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
        <span
          className="price-strikethrough"
          style={{ fontSize: 16 }}
        >
          ₹{listing.original_price}/kg
        </span>
        <span style={{ fontSize: 28, fontWeight: 800, color: urgencyColor }}>
          ₹{listing.discounted_price}
        </span>
        <span style={{ fontSize: 13, color: "#94a3b8" }}>/kg</span>
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
          -{listing.discount_pct}%
        </span>
      </div>

      {/* Freshness countdown */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <Clock size={13} color={urgencyColor} />
        <span style={{ fontSize: 13, color: urgencyColor, fontWeight: 600 }}>
          {formatRemainingLife(listing.remaining_life_hours)} freshness left
        </span>
      </div>

      {/* AI retailer message */}
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 8,
          padding: "10px 12px",
          fontSize: 13,
          color: "#cbd5e1",
          lineHeight: 1.5,
          marginBottom: 10,
        }}
      >
        {listing.retailer_message}
      </div>

      {/* Reason */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#475569" }}>
        <TrendingDown size={10} />
        {listing.reason}
      </div>
    </div>
  );
}
