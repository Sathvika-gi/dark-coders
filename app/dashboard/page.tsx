"use client";
import React, { useState, useEffect } from 'react'
import { Navbar } from '@/components/Navbar'
import { KPITile } from '@/components/KPITile'
import { TruckCard } from '@/components/TruckCard'
import { usePolling } from '@/hooks/usePolling'
import { mapAlertRows } from '@/lib/mappers'
import type { UIAlert } from '@/types/ui'

export default function DistributorDashboard() {
  const [alertsOpen, setAlertsOpen] = useState(true)

  const { data: truckData, loading: tLoading } = usePolling<{ trucks: any[] }>('/api/trucks', { intervalMs: 3000 })
  const { data: alertData, loading: aLoading } = usePolling<{ alerts: Record<string, unknown>[] }>('/api/alerts', { intervalMs: 3000 })

  const trucks = truckData ? truckData.trucks : []
  const alerts: UIAlert[] = alertData ? alertData.alerts.map((a: any) => mapAlertRows(a)) : []
  
  const loaded = !tLoading && !aLoading

  const [today, setToday] = useState('')

  useEffect(() => {
    setToday(new Date().toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long',
    }))
  }, [])

  const trucksAtRisk = trucks.filter((t: any) => t.status === 'at_risk' || t.status === 'critical').length
  const productsListed = trucks.reduce((sum: number, t: any) => sum + t.productCount, 0) // Approximation of products listed

  return (
    <div className="min-h-screen bg-cream font-sans">
      <Navbar role="distributor" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Greeting */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-medium mb-1 font-serif text-green-black">
              Fleet Overview
            </h1>
            <p className="text-sm text-muted">{today}</p>
          </div>
          <div className="flex items-center gap-3">
             {/* Auto list switch placeholder */}
             <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-border shadow-sm">
                <span className="text-sm text-green-black font-medium">Auto-list critical produce</span>
                <input type="checkbox" className="toggle" defaultChecked />
             </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <KPITile
            label="Trucks on road"
            value={loaded ? String(trucks.length) : '—'}
            trend=""
            icon="🚛"
            loading={!loaded}
          />
          <KPITile
            label="Trucks at risk"
            value={loaded ? String(trucksAtRisk) : '—'}
            trend=""
            trendUp={false}
            icon="⚠️"
            loading={!loaded}
          />
          <KPITile
            label="Products listing"
            value={loaded ? String(productsListed) : '—'}
            icon="🛒"
            loading={!loaded}
          />
          <KPITile
            label="Value rescued (₹)"
            value={loaded ? '₹2.4Cr' : '—'}
            icon="💰"
            loading={!loaded}
          />
        </div>

        {/* Main content: grid + alerts sidebar */}
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-medium font-serif text-green-black mb-5">
              Active Transit Fleet
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {loaded ? (
                trucks.map((truck: any) => (
                  <TruckCard key={truck.id} truck={truck} />
                ))
              ) : (
                [1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl h-64 animate-pulse border-2 border-border" />
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
