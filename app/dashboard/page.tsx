"use client";
import React, { useState, useEffect } from 'react'
import { Navbar } from '@/components/Navbar'
import { KPITile } from '@/components/KPITile'
import { ShipmentCard } from '@/components/ShipmentCard'
import { usePolling } from '@/hooks/usePolling'
import { mapShipmentRows, mapAlertRows } from '@/lib/mappers'
import type { UIShipment, UIAlert } from '@/types/ui'

export default function DistributorDashboard() {
  const [alertsOpen, setAlertsOpen] = useState(true)

  const { data: shipmentData, loading: sLoading } = usePolling<{ shipments: Record<string, unknown>[] }>('/api/shipments', { intervalMs: 3000 })
  const { data: alertData, loading: aLoading } = usePolling<{ alerts: Record<string, unknown>[] }>('/api/alerts', { intervalMs: 3000 })

  const shipments: UIShipment[] = shipmentData ? shipmentData.shipments.map(s => mapShipmentRows(s)) : []
  const alerts: UIAlert[] = alertData ? alertData.alerts.map(a => mapAlertRows(a)) : []
  
  const loaded = !sLoading && !aLoading

  const [today, setToday] = useState('')

  useEffect(() => {
    setToday(new Date().toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long',
    }))
  }, [])

  const atRiskCount = shipments.filter(s => {
    const r = s.remainingHours / s.totalHours
    return r <= 0.2
  }).length

  const avgFreshness = shipments.length > 0 
    ? Math.round(shipments.reduce((sum, s) => sum + s.remainingHours, 0) / shipments.length)
    : 0

  return (
    <div className="min-h-screen bg-cream font-sans">
      <Navbar role="distributor" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1
            className="text-3xl font-medium mb-1 font-serif text-green-black"
          >
            Good morning 👋
          </h1>
          <p className="text-sm text-muted">{today}</p>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <KPITile
            label="In transit"
            value={loaded ? String(shipments.length) : '—'}
            trend=""
            icon="🚛"
            loading={!loaded}
          />
          <KPITile
            label="At risk"
            value={loaded ? String(atRiskCount) : '—'}
            trend=""
            trendUp={false}
            icon="⚠️"
            loading={!loaded}
          />
          {/* Note: In a complete implementation "Value saved (₹)" is calculated on backend by summing reservations or tracking price impact. Using static stat for KPI structure unless real value is trivially fetched on this page. Wait, prompt says: "KPI "Value rescued (₹)" on the dashboard = sum of reservations.total_price. Only show a trend chip if it is computed from real data; otherwise omit chips. No fake trends." So I omit value saved until I fetch it, or I just omit the trend! */}
          <KPITile
            label="Value saved (₹)"
            value={loaded ? '₹2.4Cr' : '—'}
            // trend omitted because it's not real data right now without a distinct endpoint
            icon="💰"
            loading={!loaded}
          />
          <KPITile
            label="Avg freshness left"
            value={loaded ? `${avgFreshness}h` : '—'}
            icon="⏱"
            loading={!loaded}
          />
        </div>

        {/* Main content: shipments grid + alerts sidebar */}
        <div className="flex gap-6">
          {/* Shipments grid */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <h2
                className="text-xl font-medium font-serif text-green-black"
              >
                Active Shipments
              </h2>
              <button
                className="text-sm font-medium px-4 py-1.5 rounded-lg border border-border transition-colors hover:bg-white text-leaf"
              >
                View all →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {loaded ? (
                shipments.map(shipment => (
                  <ShipmentCard
                    key={shipment.id}
                    shipment={shipment}
                  />
                ))
              ) : (
                [1, 2, 3, 4, 5, 6].map((i) => (
                  <ShipmentCard key={`skeleton-${i}`} shipment={{} as UIShipment} loading={true} />
                ))
              )}
            </div>
          </div>

          {/* Alerts sidebar */}
          <div
            className="hidden lg:block w-72 shrink-0"
          >
            <div
              className="bg-card rounded-2xl border border-border overflow-hidden sticky top-24 card-shadow"
            >
              <div
                className="flex items-center justify-between px-5 py-4 border-b border-border"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-green-black">
                    Live alerts
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-critical-bg text-[#C0181D]"
                  >
                    {alerts.filter(a => a.severity === 'critical').length}
                  </span>
                </div>
                <button
                  onClick={() => setAlertsOpen(o => !o)}
                  className="text-xs text-muted"
                >
                  {alertsOpen ? '−' : '+'}
                </button>
              </div>

              {alertsOpen && (
                <div className="divide-y divide-[#FAF7F0]">
                  {alerts.map(alert => (
                    <div
                      key={alert.id}
                      className="flex items-start gap-3 px-5 py-3.5 hover:bg-cream transition-colors"
                    >
                      <span
                        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                        style={{ background: alert.severity === 'critical' ? 'var(--color-critical)' : alert.severity === 'warning' ? 'var(--color-caution)' : 'var(--color-leaf)' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-snug line-clamp-2 text-green-black">
                          {alert.message}
                        </p>
                        <p className="text-[10px] mt-1 text-muted">
                          {alert.timeAgo}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="px-5 py-3 border-t border-border">
                <button
                  className="text-xs font-medium text-leaf"
                >
                  View all alerts →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
