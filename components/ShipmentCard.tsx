"use client";
import React from 'react'
import { useRouter } from 'next/navigation'
import { FreshnessDial } from './FreshnessDial'
import type { UIShipment } from '@/types/ui'

interface ShipmentCardProps {
  shipment: UIShipment
  loading?: boolean
}

export function ShipmentCard({ shipment, loading }: ShipmentCardProps) {
  const router = useRouter()

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border card-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="skeleton w-10 h-10 rounded-xl" />
          <div className="skeleton w-16 h-5 rounded-full" />
        </div>
        <div className="skeleton h-5 w-28 mb-1" />
        <div className="skeleton h-4 w-36 mb-4" />
        <div className="skeleton h-20 w-full rounded-xl mb-4" />
        <div className="skeleton h-2 w-full rounded-full" />
      </div>
    )
  }

  const ratio = shipment.remainingHours / shipment.totalHours
  const state = ratio > 0.5 ? 'fresh' : ratio > 0.2 ? 'caution' : 'critical'

  return (
    <div
      className="bg-card rounded-2xl p-6 border border-border cursor-pointer transition-all duration-200 hover:-translate-y-1 group relative card-shadow"
      onClick={() => router.push(`/shipments/${shipment.id}`)}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && router.push(`/shipments/${shipment.id}`)}
      role="button"
      aria-label={`Shipment ${shipment.code}`}
    >
      {shipment.isNew && (
        <span
          className="absolute top-4 right-4 text-xs font-semibold px-2 py-0.5 rounded-full animate-new-badge"
          style={{ background: 'var(--color-tomato)', color: 'white' }}
        >
          NEW
        </span>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 bg-sage-light"
        >
          {shipment.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate text-green-black">
            {shipment.produce}
          </div>
          <div className="text-xs font-mono mt-0.5 text-muted">
            #{shipment.code}
          </div>
        </div>
      </div>

      {/* Route */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-medium text-muted">{shipment.origin}</span>
        <span className="text-xs" style={{ color: '#D4CCBB' }}>→</span>
        <span className="text-xs font-medium text-muted">{shipment.destination}</span>
      </div>

      {/* Freshness Dial */}
      <div className="flex justify-center mb-4">
        <FreshnessDial
          totalHours={shipment.totalHours}
          remainingHours={shipment.remainingHours}
          size={130}
        />
      </div>

      {/* Temperature chip */}
      <div className="flex items-center justify-between mb-4">
        <span
          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
          style={{
            background: shipment.tempStatus === 'high' ? 'var(--color-critical-bg)' : 'var(--color-fresh-bg)',
            color: shipment.tempStatus === 'high' ? '#C0181D' : 'var(--color-leaf)',
          }}
        >
          🌡 {shipment.temperature}°C
          {shipment.tempStatus === 'high' && ' · High'}
        </span>

        {/* View details arrow */}
        <span
          className="text-xs font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-leaf"
        >
          Details
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </span>
      </div>

      {/* Route progress bar */}
      <div>
        <div className="h-1.5 rounded-full overflow-hidden border-border bg-[#EEE9DD]">
          <div
            className="h-full rounded-full transition-all bg-leaf"
            style={{ width: `${shipment.progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-muted">
            {shipment.progress}% delivered
          </span>
          <span className="text-[10px]">🚚</span>
        </div>
      </div>
    </div>
  )
}
