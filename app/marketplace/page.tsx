"use client";
import React, { useState, useEffect, useRef } from 'react'
import { Navbar } from '@/components/Navbar'
import { Toast } from '@/components/Toast'
import { Drawer } from '@/components/Drawer'
import { usePolling } from '@/hooks/usePolling'
import { mapListingRows } from '@/lib/mappers'
import type { UIListing } from '@/types/ui'

type Filter = 'all' | 'flash' | 'under24' | 'vegetable' | 'fruit'

function freshnessColor(hours: number) {
  if (hours > 48) return { bg: 'var(--color-fresh-bg)', color: 'var(--color-leaf)' }
  if (hours > 12) return { bg: 'var(--color-caution-bg)', color: '#B87A1A' }
  return { bg: 'var(--color-critical-bg)', color: '#C0181D' }
}

interface ListingCardProps {
  listing: UIListing
  onReserve: (listing: UIListing) => void
}

function ListingCard({ listing, onReserve }: ListingCardProps) {
  const fc = freshnessColor(listing.freshnessHours)
  const formatHours = (h: number) => h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${Math.floor(h)}h`

  return (
    <div
      className="bg-card rounded-2xl border border-border overflow-hidden transition-all duration-200 hover:-translate-y-1 animate-scale-in card-shadow"
    >
      <div
        className="relative flex items-center justify-center py-8"
        style={{ background: 'linear-gradient(145deg, #FAF7F0 0%, #F0EDE6 100%)' }}
      >
        <span className="text-5xl">{listing.emoji}</span>

        {listing.discountPct > 0 && (
          <div
            className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ background: 'var(--color-tomato)', color: 'white' }}
          >
            −{listing.discountPct}%
          </div>
        )}

        {listing.isNew && (
          <div
            className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-xs font-bold animate-new-badge bg-leaf text-white"
          >
            NEW
          </div>
        )}

        {listing.isFlashSale && (
          <div
            className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-caution-bg text-caution"
          >
            ⚡ Flash sale
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="font-semibold text-sm leading-tight text-green-black">
              {listing.produce}
            </h3>
            <p className="text-xs mt-0.5 text-muted">{listing.quantityStr}</p>
          </div>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-2"
            style={{ background: fc.bg, color: fc.color }}
          >
            {formatHours(listing.freshnessHours)} left
          </span>
        </div>

        <div className="flex items-baseline gap-2 mt-3 mb-2">
          <span
            className="text-2xl font-semibold tabular-nums font-serif text-green-black"
          >
            ₹{listing.discountedPrice}
          </span>
          {listing.discountPct > 0 && (
            <span className="text-sm line-through text-muted">
              ₹{listing.originalPrice}
            </span>
          )}
        </div>

        <p className="text-xs mb-4 leading-relaxed line-clamp-2 text-muted">
          {listing.aiLine}
        </p>

        <button
          onClick={() => onReserve(listing)}
          disabled={listing.availableKg <= 0}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 hover:brightness-95 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-leaf card-shadow"
        >
          {listing.availableKg <= 0 ? 'Sold Out' : 'Reserve'}
        </button>
      </div>
    </div>
  )
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'flash', label: '⚡ Flash sale' },
  { key: 'under24', label: '⏱ Under 24h' },
  { key: 'vegetable', label: '🥦 Vegetables' },
  { key: 'fruit', label: '🍊 Fruits' },
]

export default function RetailerMarketplace() {
  const [activeFilter, setActiveFilter] = useState<Filter>('all')
  const [sortBy, setSortBy] = useState<'freshness' | 'price' | 'discount'>('discount')
  
  const [toast, setToast] = useState<{ id: string, produce: string, discount: number, remainingHours: number } | null>(null)
  const knownListingIds = useRef<Set<string>>(new Set())

  const [reserving, setReserving] = useState<UIListing | null>(null)
  const [qty, setQty] = useState(1) // 1 unit default
  const [reserveStatus, setReserveStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [reserveError, setReserveError] = useState('')

  const { data: listingData, loading } = usePolling<{ listings: Record<string, unknown>[] }>('/api/listings', { intervalMs: 3000 })
  
  const rawListings = listingData?.listings ?? []
  const listings: UIListing[] = rawListings.map(row => mapListingRows(row))

  useEffect(() => {
    // Check for *new* flash sales to show a toast
    if (listings.length > 0) {
      if (knownListingIds.current.size === 0) {
        // Initial load, just track all so we don't spam toasts on mount
        listings.forEach(l => knownListingIds.current.add(l.id))
      } else {
        const newFlashSales = listings.filter(l => !knownListingIds.current.has(l.id) && l.isFlashSale)
        if (newFlashSales.length > 0) {
          const l = newFlashSales[0]
          setToast({ id: l.id, produce: l.produce, discount: l.discountPct, remainingHours: l.freshnessHours })
        }
        // Track everything new so we don't toast twice
        listings.forEach(l => knownListingIds.current.add(l.id))
      }
    }
  }, [listings])

  const filtered = listings.filter(l => {
    if (activeFilter === 'flash') return l.isFlashSale
    if (activeFilter === 'under24') return l.freshnessHours < 24
    if (activeFilter === 'vegetable') return l.category === 'vegetable'
    if (activeFilter === 'fruit') return l.category === 'fruit'
    return true
  }).sort((a, b) => {
    if (sortBy === 'freshness') return a.freshnessHours - b.freshnessHours
    if (sortBy === 'price') return a.discountedPrice - b.discountedPrice
    return b.discountPct - a.discountPct
  })

  const handleReserve = (listing: UIListing) => {
    setReserving(listing)
    setQty(Math.min(1, listing.availableKg))
    setReserveStatus('idle')
    setReserveError('')
  }

  const handleConfirm = async () => {
    if (!reserving) return
    setReserveStatus('loading')
    setReserveError('')
    
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: reserving.id, qty_kg: qty })
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to reserve')
      }
      setReserveStatus('success')
    } catch (e: unknown) {
      setReserveStatus('error')
      if (e instanceof Error) {
        setReserveError(e.message)
      } else {
        setReserveError('Failed to reserve')
      }
    }
  }

  const handleCloseDrawer = () => {
    setReserving(null)
    setReserveStatus('idle')
  }

  return (
    <div className="min-h-screen pb-16 bg-cream font-sans">
      <Navbar role="retailer" />

      {/* Smart Toast */}
      <Toast
        visible={!!toast}
        message={toast ? `Flash markdown: ${toast.produce} −${toast.discount}%` : ''}
        subtext={toast ? `${Math.floor(toast.remainingHours)}h freshness left — act fast` : ''}
        onView={() => setToast(null)}
        onDismiss={() => setToast(null)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1
            className="text-3xl font-medium mb-1.5 font-serif text-green-black"
          >
            Fresh deals near you
          </h1>
          <p className="text-sm text-muted">
            AI-priced perishables — reserve before they&apos;re gone
          </p>
        </div>

        {/* Filters + sort */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className="px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-150"
                style={{
                  background: activeFilter === f.key ? 'var(--color-leaf)' : 'white',
                  color: activeFilter === f.key ? 'white' : 'var(--color-muted)',
                  border: `1px solid \${activeFilter === f.key ? 'var(--color-leaf)' : 'var(--color-border)'}`,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="ml-auto">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'freshness' | 'price' | 'discount')}
              className="text-sm border border-border rounded-xl px-3 py-2 bg-white text-green-black outline-none"
            >
              <option value="discount">Sort: Biggest discount</option>
              <option value="freshness">Sort: Freshest first</option>
              <option value="price">Sort: Lowest price</option>
            </select>
          </div>
        </div>

        {/* Listing grid */}
        {loading && filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted">Loading deals...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <span className="text-4xl">🌿</span>
            <p className="font-semibold text-green-black">No listings match this filter</p>
            <button
              onClick={() => setActiveFilter('all')}
              className="text-sm text-leaf"
            >
              Clear filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onReserve={handleReserve}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reserve drawer */}
      <Drawer
        open={!!reserving}
        onClose={handleCloseDrawer}
        title={reserveStatus === 'success' ? 'Reserved!' : `Reserve ${reserving?.produce || ''}`}
      >
        {reserving && reserveStatus !== 'success' && (
          <div className="flex flex-col h-full">
            <div
              className="flex items-center gap-4 p-4 rounded-2xl mb-6 bg-cream border border-border"
            >
              <span className="text-3xl">{reserving.emoji}</span>
              <div>
                <p className="font-semibold text-green-black">{reserving.produce}</p>
                <p className="text-xs text-muted">{reserving.quantityStr}</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-3 text-green-black">
                Quantity (units)
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-lg font-semibold transition-colors hover:bg-cream text-green-black"
                >
                  −
                </button>
                <span
                  className="text-2xl font-semibold tabular-nums w-14 text-center font-serif text-green-black"
                >
                  {qty}
                </span>
                <button
                  onClick={() => setQty(q => Math.min(reserving.availableKg, q + 1))}
                  className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-lg font-semibold transition-colors hover:bg-cream text-green-black"
                >
                  +
                </button>
              </div>
            </div>

            <div
              className="rounded-2xl p-4 mb-6 bg-cream border border-border"
            >
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted">Unit price</span>
                <span className="text-green-black">₹{reserving.discountedPrice}</span>
              </div>
              <div className="flex justify-between text-sm mb-3">
                <span className="text-muted">Quantity</span>
                <span className="text-green-black">× {qty}</span>
              </div>
              <div
                className="flex justify-between font-semibold pt-3 border-t border-border"
              >
                <span className="text-green-black">Total</span>
                <span
                  className="text-lg tabular-nums font-serif text-leaf"
                >
                  ₹{(reserving.discountedPrice * qty).toLocaleString('en-IN')}
                </span>
              </div>
              {reserving.discountPct > 0 && (
                <p className="text-xs mt-2 text-muted">
                  Saved ₹{((reserving.originalPrice - reserving.discountedPrice) * qty).toLocaleString('en-IN')} vs original price
                </p>
              )}
            </div>

            {reserveError && (
              <p className="text-critical text-sm mb-4 font-semibold text-center">{reserveError}</p>
            )}

            <button
              onClick={handleConfirm}
              disabled={reserveStatus === 'loading'}
              className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all hover:brightness-95 bg-leaf card-shadow disabled:opacity-50"
            >
              {reserveStatus === 'loading' ? 'Processing...' : 'Confirm reservation →'}
            </button>
          </div>
        )}

        {reserving && reserveStatus === 'success' && (
          <div className="flex flex-col items-center justify-center h-full gap-5 text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl animate-scale-in bg-fresh-bg text-leaf"
            >
              ✓
            </div>
            <div>
              <h3
                className="text-2xl font-medium mb-2 font-serif text-green-black"
              >
                Reserved!
              </h3>
              <p className="text-sm text-muted mb-2">
                {qty} × {reserving.produce} reserved successfully.
                <br />
                Collect within {reserving.freshnessHours > 24 ? `${Math.floor(reserving.freshnessHours / 24)} days` : `${Math.floor(reserving.freshnessHours)} hours`}.
              </p>
            </div>
            <div
              className="w-full rounded-2xl p-4 bg-cream border border-border"
            >
              <div className="flex justify-between text-sm">
                <span className="text-muted">Order total</span>
                <span
                  className="font-semibold tabular-nums font-serif text-leaf"
                >
                  ₹{(reserving.discountedPrice * qty).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <button
              onClick={handleCloseDrawer}
              className="w-full py-3 rounded-xl font-medium border border-border transition-colors hover:bg-cream text-muted"
            >
              Continue browsing
            </button>
          </div>
        )}
      </Drawer>
    </div>
  )
}
