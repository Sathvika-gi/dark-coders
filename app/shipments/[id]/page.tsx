/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceArea, ResponsiveContainer,
} from 'recharts'
import { Navbar } from '@/components/Navbar'
import { FreshnessDial, formatTime } from '@/components/FreshnessDial'
import { getProduceUI } from '@/lib/produce-ui'
import { useRouter, useParams } from 'next/navigation'

const STEPPER_STEPS = [
  'Sending readings',
  'Calculating shelf life',
  'Updating price',
  'Alert sent',
]

type SimState = 'idle' | 'running' | 'done' | 'error'

const CustomTooltip = ({ active, payload, label, idealTempRange }: any) => {
  if (!active || !payload?.length) return null
  
  // Check if the individual point is high temp based on ideal range
  const isHigh = idealTempRange && payload[0].value > idealTempRange[1]
  
  return (
    <div
      className="bg-card rounded-xl px-3 py-2 border border-border text-xs card-shadow"
    >
      <p className="text-muted">Hour {label}</p>
      <p style={{ color: isHigh ? 'var(--color-critical)' : 'var(--color-fresh)', fontWeight: 600 }}>
        {payload[0].value}°C
      </p>
    </div>
  )
}

function ShipmentDetailContent() {
  const router = useRouter()
  const params = useParams()
  const shipmentId = params.id as string

  const [simState, setSimState] = useState<SimState>('idle')
  const [simStep, setSimStep] = useState(-1)
  const [simPanelOpen, setSimPanelOpen] = useState(true)
  const [simError, setSimError] = useState('')

  const [activeTab, setActiveTab] = useState<'temperature' | 'humidity' | 'why'>('temperature')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Record<string, unknown> | null>(null)

  const fetchDetail = async () => {
    try {
      const res = await fetch(`/api/shipments/${shipmentId}`)
      if (!res.ok) throw new Error("Failed to load")
      const json = await res.json()
      setData(json)
    } catch (e: unknown) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setTimeout(() => { fetchDetail() }, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipmentId])


  const runSpike = async () => {
    setSimState('running')
    setSimStep(0)
    setSimError('')
    try {
      // step 1: Sending readings
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipment_id: shipmentId, scenario: 'spike' })
      })

      setSimStep(1) // calculating shelf life
      if (!res.ok) throw new Error('Simulation API failed')

      setTimeout(() => setSimStep(2), 500) // Updating price
      setTimeout(() => setSimStep(3), 1000) // Alert sent
      setTimeout(() => {
        setSimState('done')
        setSimStep(-1)
        fetchDetail() // reload to show new data
      }, 1500)

    } catch (e: any) {
      setSimState('error')
      setSimError(e.message)
    }
  }

  const runNormal = async () => {
    setSimState('running')
    setSimStep(0)
    setSimError('')
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipment_id: shipmentId, scenario: 'normal' })
      })

      setSimStep(1)
      if (!res.ok) throw new Error('Simulation API failed')
      
      setTimeout(() => setSimStep(2), 500)
      setTimeout(() => setSimStep(3), 1000)
      setTimeout(() => {
        setSimState('done')
        setSimStep(-1)
        fetchDetail()
      }, 1500)

    } catch (e: unknown) {
      setSimState('error')
      setSimError(e instanceof Error ? e.message : 'Error')
    }
  }

  const resetDemo = async () => {
    setSimState('running')
    setSimStep(0)
    try {
      await fetch('/api/demo/reset', { method: 'POST' })
      setSimState('idle')
      setSimStep(-1)
      fetchDetail()
    } catch (e) {
      setSimState('error')
      setSimError("Failed to reset demo")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pb-32 bg-cream font-sans">
        <Navbar role="distributor" />
        <div className="flex items-center justify-center p-20">Loading...</div>
      </div>
    )
  }

  if (!data || !data.shipment) {
    return (
      <div className="min-h-screen pb-32 bg-cream font-sans">
        <Navbar role="distributor" />
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <p>Shipment not found</p>
          <button onClick={() => router.push('/dashboard')} className="text-leaf">Back to Dashboard</button>
        </div>
      </div>
    )
  }

  const s = data.shipment as Record<string, any>
  const ui = getProduceUI(s.produce_type)
  const isSpiked = s.status === 'at_risk' || s.status === 'critical'
  
  // Transform telemetry for chart
  let startH = 0
  const telemetry = Array.isArray(data.telemetry) ? data.telemetry : []
  if (telemetry.length > 0) {
    startH = new Date(telemetry[0].recorded_at).getTime()
  }

  const chartData = telemetry.map((t: Record<string, unknown>) => {
    const timeDiffMs = new Date(t.recorded_at as string).getTime() - startH
    return {
      h: Math.round(timeDiffMs / 3600000), // convert ms to hours relative to first record
      temp: t.temp_c as number,
      humidity: t.humidity_pct as number
    }
  })

  // Prepare price / discount details
  const activeListing = data.active_listing as Record<string, any> | undefined
  const hasListing = activeListing && activeListing.discount_pct > 0
  const originalPrice = activeListing?.original_price ?? s.base_price_per_kg
  const currentPrice = activeListing?.discounted_price ?? s.current_price_per_kg
  
  // Model breakdown timeline
  const breakdown = (data.breakdown as Record<string, unknown>[]) || []

  // Ensure AI insight has fallback
  const insightRaw = (activeListing?.reason as string) || "Shipment is progressing normally. Estimated arrival at destination with freshness remaining within optimal range.";
  let insightText = insightRaw.replace(/^AI: /, '').trim();
  
  // If no listing (fresh), provide template text
  if (!activeListing && !isSpiked) {
    const rem = formatTime(s.remaining_life_hours)
    insightText = `Shipment is progressing normally. ETA and freshness timeline align with initial projections.`
  }

  const statusObj = (() => {
    const r = s.remaining_life_hours / s.initial_life_hours
    if (r > 0.5) return { label: 'In transit', bg: 'var(--color-fresh-bg)', color: 'var(--color-leaf)' }
    if (r > 0.2) return { label: 'At risk', bg: 'var(--color-caution-bg)', color: '#B87A1A' }
    return { label: 'Critical', bg: 'var(--color-critical-bg)', color: '#C0181D' }
  })()
  
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now()
  const alerts = Array.isArray(data.alerts) ? data.alerts : []

  return (
    <div className="min-h-screen pb-32 bg-cream font-sans">
      <Navbar role="distributor" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm text-muted">
          <button
            onClick={() => router.push('/dashboard')}
            className="hover:text-leaf transition-colors flex items-center gap-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Dashboard
          </button>
          <span style={{ color: '#D4CCBB' }}>›</span>
          <span className="text-green-black">#{s.code}</span>
        </div>

        {/* Title row */}
        <div className="flex items-center gap-4 mb-8 flex-wrap">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-sage-light"
          >
            {ui.emoji}
          </div>
          <div>
            <h1
              className="text-2xl font-medium font-serif text-green-black"
            >
              {ui.label}
            </h1>
            <p className="text-sm text-muted">
              {s.origin} → {s.destination}
            </p>
          </div>
          <span
            className="px-3 py-1 rounded-full text-sm font-medium ml-auto"
            style={{ background: statusObj.bg, color: statusObj.color }}
          >
            {statusObj.label}
          </span>
        </div>

        {/* Hero row: Dial + Price card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Freshness Dial */}
          <div
            className="bg-card rounded-2xl p-8 border border-border flex flex-col items-center card-shadow"
          >
            <FreshnessDial
              totalHours={s.initial_life_hours}
              remainingHours={s.remaining_life_hours}
              size={200}
              animate
            />
          </div>

          {/* Price card */}
          <div
            className="bg-card rounded-2xl p-8 border border-border flex flex-col justify-center card-shadow"
          >
            <p className="text-sm font-medium mb-2 text-muted">
              Current market price
            </p>
            <div className="flex items-end gap-3 mb-3">
              <span
                className="text-4xl font-semibold tabular-nums font-serif text-green-black"
              >
                ₹{currentPrice}
              </span>
              {hasListing && (
                <span
                  className="text-xl relative animate-strike text-muted"
                >
                  ₹{originalPrice}
                </span>
              )}
            </div>

            {hasListing ? (
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-1 rounded-full text-sm font-semibold text-white tracking-wide"
                  style={{ background: 'var(--color-tomato)' }}
                >
                  −{activeListing.discount_pct}% markdown
                </span>
                <span className="text-xs text-muted">
                  auto-triggered by AI
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-fresh-bg text-leaf"
                >
                  Base price active
                </span>
              </div>
            )}

            <div className="mt-5 p-3 rounded-xl bg-cream border border-border">
              <div className="text-xs font-medium mb-1 text-muted">
                Markdown tiers
              </div>
              {[
                { range: '> 50% freshness', tier: 'Base price', active: s.current_tier === 'none' || !hasListing },
                { range: '20–50% freshness', tier: '−25% markdown', active: s.current_tier === 'tier25' },
                { range: '< 20% freshness', tier: '−45% markdown', active: s.current_tier === 'tier45' },
              ].map((t, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-xs" style={{ color: t.active ? 'var(--color-green-black)' : 'var(--color-muted)' }}>
                    {t.range}
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: t.active ? 'var(--color-tomato)' : 'var(--color-muted)' }}
                  >
                    {t.tier}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="bg-card rounded-2xl border border-border overflow-hidden mb-6 card-shadow"
        >
          {/* Tab switcher */}
          <div className="flex border-b border-border">
            {(['temperature', 'humidity', 'why'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-6 py-4 text-sm font-medium transition-colors relative"
                style={{
                  color: activeTab === tab ? 'var(--color-leaf)' : 'var(--color-muted)',
                  borderBottom: activeTab === tab ? '2px solid var(--color-leaf)' : '2px solid transparent',
                  background: 'white',
                }}
              >
                {tab === 'temperature' ? '🌡 Temperature' : tab === 'humidity' ? '💧 Humidity' : '🔍 Why it dropped'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-6 animate-fade-in" key={activeTab}>
            {activeTab === 'temperature' && (
              <div>
                <div className="flex items-center gap-4 mb-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 rounded-full inline-block bg-fresh" />
                    <span className="text-muted">Temperature</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded inline-block opacity-30 bg-fresh" />
                    <span className="text-muted">Safe band ({s.ideal_temp_range?.[0]}–{s.ideal_temp_range?.[1]}°C)</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" />
                    <XAxis
                      dataKey="h"
                      tickFormatter={(val) => `${val}h`}
                      tick={{ fontSize: 11, fill: '#6B7568' }}
                    />
                    <YAxis
                      tickFormatter={(val) => `${val}°`}
                      tick={{ fontSize: 11, fill: '#6B7568' }}
                      domain={[0, 'auto']}
                    />
                    <Tooltip content={(props) => <CustomTooltip {...props} idealTempRange={s.ideal_temp_range} />} />
                    {/* Safe band */}
                    {s.ideal_temp_range && (
                      <ReferenceArea y1={s.ideal_temp_range[0]} y2={s.ideal_temp_range[1]} fill="#2F9E5B" fillOpacity={0.08} />
                    )}
                    <Line
                      type="monotone"
                      dataKey="temp"
                      stroke="var(--color-fresh)"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4, fill: 'var(--color-fresh)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeTab === 'humidity' && (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <div className="text-3xl">💧</div>
                <p className="text-sm font-medium text-green-black">
                  Avg relative humidity: {chartData.length ? Math.round(chartData.reduce((sum: number, c: any) => sum + c.humidity, 0) / chartData.length) : '--'}%
                </p>
                <p className="text-xs text-muted">
                  View humidity trends across the cold chain journey
                </p>
              </div>
            )}

            {activeTab === 'why' && (
               <div className="space-y-0">
                 {breakdown.length === 0 ? (
                   <p className="text-sm text-muted py-4">No significant anomalies detected yet.</p>
                 ) : (
                   breakdown.map((step: any, i: number) => {
                     // Determine status
                     const status = step.burn_rate > 3 ? 'critical' : step.burn_rate > 1.5 ? 'caution' : 'info';
                     return (
                       <div key={i} className="flex gap-4">
                         <div className="flex flex-col items-center">
                           <div
                             className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                             style={{
                               background:
                                 status === 'critical' ? 'var(--color-critical-bg)' :
                                 status === 'caution' ? 'var(--color-caution-bg)' : 'var(--color-sage-light)',
                             }}
                           >
                             {status === 'critical' ? '🌡' : status === 'caution' ? '⚡' : '📊'}
                           </div>
                           {i < breakdown.length - 1 && (
                             <div className="w-0.5 flex-1 my-1 bg-border" />
                           )}
                         </div>
                         <div className="pb-6">
                           <p className="text-sm font-semibold mb-1 text-green-black">
                             {new Date(step.time).toLocaleString([], { hour: '2-digit', minute:'2-digit' })}
                           </p>
                           <p className="text-xs leading-relaxed text-muted">
                             Temp: {step.temp_c}°C / Burn Rate: {step.burn_rate}x
                           </p>
                         </div>
                       </div>
                     )
                   })
                 )}
               </div>
             )}
          </div>
        </div>

        {/* AI Insight card */}
        <div
          className="rounded-2xl p-5 mb-6 flex items-start gap-3"
          style={{ background: 'var(--color-sage-light)', border: '1px solid var(--color-sage)' }}
        >
          <span className="text-xl">✨</span>
          <div>
            <p className="text-sm font-semibold mb-0.5 text-leaf">
              AI Insight
            </p>
            <p className="text-sm text-green-black" style={{ lineHeight: 1.6 }}>
              {insightText}
            </p>
          </div>
        </div>

        {/* New alert from spike (derived from alerts API if within last 2 minutes and critical) */}
        {alerts.some((a: Record<string, unknown>) => a.severity === 'critical' && (nowMs - new Date(a.created_at as string).getTime() < 120000)) && (
          <div
            className="rounded-2xl p-4 mb-6 flex items-center gap-3 animate-scale-in"
            style={{ background: 'var(--color-critical-bg)', border: '1px solid #F5C6C7' }}
          >
            <span className="text-red-500 text-lg">🔔</span>
            <p className="text-sm font-medium" style={{ color: '#C0181D' }}>
              New alert: Critical temperature spike logged — price markdown auto-applied to all retailers
            </p>
          </div>
        )}
      </div>

      {/* Demo simulator panel */}
      <div
        className="fixed bottom-6 right-6 z-40"
        style={{ maxWidth: 320 }}
      >
        <div
          className="bg-card rounded-2xl border border-border overflow-hidden"
          style={{ boxShadow: '0 8px 32px rgba(31,42,31,0.14)' }}
        >
          <button
            onClick={() => setSimPanelOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold border-b border-border text-green-black"
          >
            <span className="flex items-center gap-2">
              <span>🧪</span> Demo Simulator
            </span>
            <span className="text-muted">{simPanelOpen ? '▾' : '▴'}</span>
          </button>

          {simPanelOpen && (
            <div className="p-4">
              {simState === 'idle' && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={runNormal}
                    className="w-full py-2.5 rounded-xl text-sm font-medium border border-border transition-colors hover:bg-cream text-muted"
                  >
                    Normal readings
                  </button>
                  <button
                    onClick={runSpike}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{ background: 'var(--color-tomato)', boxShadow: '0 4px 12px rgba(242,107,79,0.35)' }}
                  >
                    🌡 Simulate temperature spike
                  </button>
                </div>
              )}

              {simState === 'running' && (
                <div className="space-y-2">
                  {STEPPER_STEPS.map((step, i) => (
                    <div key={step} className="flex items-center gap-2.5">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0"
                        style={{
                          background:
                            i < simStep ? 'var(--color-fresh-bg)' :
                            i === simStep ? 'var(--color-leaf)' : 'var(--color-border)',
                          color: i === simStep ? 'white' : i < simStep ? 'var(--color-leaf)' : 'var(--color-muted)',
                        }}
                      >
                        {i < simStep ? '✓' : i === simStep ? (
                          <span className="animate-spin-slow inline-block">⟳</span>
                        ) : i + 1}
                      </div>
                      <span
                        className="text-xs"
                        style={{
                          color: i <= simStep ? 'var(--color-green-black)' : 'var(--color-muted)',
                          fontWeight: i === simStep ? 600 : 400,
                        }}
                      >
                        {step}
                      </span>
                    </div>
                  ))}
                  {simError && (
                    <p className="text-xs text-critical mt-2">{simError}</p>
                  )}
                </div>
              )}

              {simState === 'done' && (
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="w-10 h-10 rounded-full bg-fresh-bg flex items-center justify-center text-lg text-leaf">
                    ✓
                  </div>
                  <p className="text-xs font-medium text-center text-leaf">
                    Simulation finished and UI refreshed!
                  </p>
                </div>
              )}

              {(simState === 'error' || simState === 'done') && (
                <button
                  onClick={resetDemo}
                  className="w-full mt-3 py-2 rounded-xl text-xs font-medium border border-border transition-colors hover:bg-cream text-muted"
                >
                  Reset demo
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ShipmentDetail() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen pb-32 bg-cream font-sans">
        {/* <Navbar role="distributor" /> - avoiding direct import usage if problematic, just a loader */}
        <div className="flex items-center justify-center p-20">Loading...</div>
      </div>
    }>
      <ShipmentDetailContent />
    </React.Suspense>
  )
}
