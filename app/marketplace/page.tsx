"use client";
/**
 * app/marketplace/page.tsx
 * Retailer marketplace — live listing grid with flash markdown toast.
 * Polls /api/listings every 2 seconds and shows a toast when new listings appear.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { ListingCard } from "@/components/ListingCard";
import { MarkdownToast } from "@/components/MarkdownToast";
import { Store, TrendingDown, Clock } from "lucide-react";

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

type SortOption = "discount" | "freshness" | "newest";

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Listing | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const seenIds = useRef<Set<string>>(new Set());
  const lastFetchedAt = useRef<string | null>(null);

  const fetchListings = useCallback(async () => {
    try {
      const url = lastFetchedAt.current
        ? `/api/listings?since=${encodeURIComponent(lastFetchedAt.current)}`
        : "/api/listings";

      const res = await fetch(url);
      if (!res.ok) return;

      const { listings: fresh, fetched_at } = await res.json();
      lastFetchedAt.current = fetched_at;

      if (fresh && fresh.length > 0) {
        // Find genuinely new listings
        const newOnes = (fresh as Listing[]).filter((l) => !seenIds.current.has(l.id));
        newOnes.forEach((l) => seenIds.current.add(l.id));

        if (newOnes.length > 0) {
          // Show toast for the most urgent new listing
          const mostUrgent = newOnes.sort((a, b) => b.discount_pct - a.discount_pct)[0];
          setToast({ ...mostUrgent, isNew: true });
          // Auto-dismiss after 6s
          setTimeout(() => setToast(null), 6000);
        }

        // Merge new listings into state
        setListings((prev) => {
          const existingIds = new Set(prev.map((l) => l.id));
          const merged = [
            ...newOnes.map((l) => ({ ...l, isNew: true })),
            ...prev.map((l) => ({ ...l, isNew: false })),
          ].filter((l) => existingIds.has(l.id) || !seenIds.current.has(l.id) || newOnes.some((n) => n.id === l.id));
          // De-dup by id keeping only first occurrence
          const seen = new Set<string>();
          return merged.filter((l) => (seen.has(l.id) ? false : (seen.add(l.id), true)));
        });
      }

      // On first load, fetch all listings
      if (!lastFetchedAt.current || listings.length === 0) {
        const allRes = await fetch("/api/listings");
        if (allRes.ok) {
          const { listings: all } = await allRes.json();
          setListings((all ?? []).map((l: Listing) => ({ ...l, isNew: false })));
          (all ?? []).forEach((l: Listing) => seenIds.current.add(l.id));
        }
      }
    } catch (e) {
      console.error("[marketplace] fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [listings.length]);

  // Initial full fetch
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/listings");
      if (res.ok) {
        const { listings: all, fetched_at } = await res.json();
        const allWithMeta = (all ?? []).map((l: Listing) => ({ ...l, isNew: false }));
        setListings(allWithMeta);
        allWithMeta.forEach((l: Listing) => seenIds.current.add(l.id));
        lastFetchedAt.current = fetched_at;
      }
      setLoading(false);
    })();
  }, []);

  // Poll for new listings every 2s
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!lastFetchedAt.current) return;
      try {
        const res = await fetch(`/api/listings?since=${encodeURIComponent(lastFetchedAt.current)}`);
        if (!res.ok) return;
        const { listings: fresh, fetched_at } = await res.json();
        lastFetchedAt.current = fetched_at;
        if (fresh && fresh.length > 0) {
          const newOnes = (fresh as Listing[]).filter((l) => !seenIds.current.has(l.id));
          newOnes.forEach((l) => seenIds.current.add(l.id));
          if (newOnes.length > 0) {
            const mostUrgent = [...newOnes].sort((a, b) => b.discount_pct - a.discount_pct)[0];
            setToast({ ...mostUrgent, isNew: true });
            setTimeout(() => setToast(null), 6000);
            setListings((prev) => {
              const m = [...newOnes.map((l) => ({ ...l, isNew: true })), ...prev];
              const seen = new Set<string>();
              return m.filter((l) => (seen.has(l.id) ? false : (seen.add(l.id), true)));
            });
          }
        }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Sort listings
  const sorted = [...listings].sort((a, b) => {
    if (sortBy === "discount") return b.discount_pct - a.discount_pct;
    if (sortBy === "freshness") return a.remaining_life_hours - b.remaining_life_hours;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar role="retailer" />

      {/* Toast */}
      {toast && (
        <MarkdownToast
          message={toast.retailer_message}
          discountPct={toast.discount_pct}
          remainingHours={toast.remaining_life_hours}
          onClose={() => setToast(null)}
        />
      )}

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Store size={22} color="#10b981" />
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>
                Fresh Marketplace
              </h1>
            </div>
            <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
              Live markdown listings · Auto-refreshing every 2s
            </p>
          </div>

          {/* Sort controls */}
          <div style={{ display: "flex", gap: 8 }}>
            {([
              { key: "newest", icon: Clock, label: "Newest" },
              { key: "discount", icon: TrendingDown, label: "Biggest Discount" },
              { key: "freshness", icon: Clock, label: "Freshness" },
            ] as const).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                id={`sort-${key}`}
                className={`btn ${sortBy === key ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setSortBy(key)}
                style={{ fontSize: 12, padding: "7px 14px" }}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Listings grid */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 280, borderRadius: 16 }} />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div
            className="glass-card"
            style={{
              padding: 60,
              textAlign: "center",
              color: "#475569",
              fontSize: 15,
            }}
          >
            <Store size={40} style={{ opacity: 0.2, marginBottom: 16 }} />
            <div>No active listings right now.</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>
              Listings appear automatically when a shipment&apos;s price drops. Ask the Distributor
              to run a Simulate Spike on AGS-101.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {sorted.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
