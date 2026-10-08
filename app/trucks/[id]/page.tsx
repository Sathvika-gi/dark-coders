"use client";
import React, { useState, useEffect, use } from 'react'
import { Navbar } from '@/components/Navbar'
import { ShipmentCard } from '@/components/ShipmentCard'
import { mapShipmentRows } from '@/lib/mappers'
import type { UIShipment } from '@/types/ui'
import { useRouter } from 'next/navigation'

export default function TruckDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  // React 19 unwraps params via use()
  const { id } = use(params)
  
  const [data, setData] = useState<{ truck: any, shipments: any[] } | null>(null)
  const [loading, setLoading] = useState(true)

  // Simulator state
  const [simPanelOpen, setSimPanelOpen] = useState(true)
  const [simState, setSimState] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [simStep, setSimStep] = useState(-1)
  const [simError, setSimError] = useState('')

  const fetchDetail = async () => {
    try {
      const res = await fetch(`/api/trucks/${id}`)
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
    fetchDetail()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen pb-32 bg-cream font-sans">
        <Navbar role="distributor" />
        <div className="flex items-center justify-center p-20 animate-pulse text-muted">Loading fleet data...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen pb-32 bg-cream font-sans flex items-center justify-center">
        Truck not found
      </div>
    )
  }

  const shipments: UIShipment[] = data.shipments.map(s => mapShipmentRows(s))
  
  const runSpike = () => {
    setSimState('running')
    setSimStep(0)
    setSimError('')
    setTimeout(() => setSimStep(1), 500)
    setTimeout(() => setSimStep(2), 1000)
    setTimeout(() => {
      setSimState('done')
      setSimStep(-1)
      alert("Simulated spike across entire truck!")
    }, 1500)
  }

  return (
    <div className="min-h-screen pb-32 bg-cream font-sans">
      <Navbar role="distributor" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm text-muted">
          <button
            onClick={() => router.push('/dashboard')}
            className="hover:text-leaf transition-colors flex items-center gap-1"
          >
            Dashboard (Fleet)
          </button>
          <span style={{ color: '#D4CCBB' }}>›</span>
          <span className="text-green-black">{data.truck.code}</span>
        </div>

        {/* Truck Header */}
        <div className="flex items-center justify-between mb-8">
           <div>
              <h1 className="text-3xl font-medium mb-1 font-serif text-green-black">
                {data.truck.code}
              </h1>
              <p className="text-sm text-muted">
                {data.truck.origin} → {data.truck.destination}
              </p>
           </div>
           <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-critical-bg text-critical border border-[#F5C6C7]">
              {data.truck.status === 'critical' ? 'Critical' : 'In Transit'}
           </span>
        </div>

        {/* Shipments Grid */}
        <h2 className="text-xl font-medium font-serif text-green-black mb-5">
           Cargo Manifest
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {shipments.map(shipment => (
             <ShipmentCard key={shipment.id} shipment={shipment} />
          ))}
        </div>
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
              <span>🧪</span> Fleet Simulator
            </span>
            <span className="text-muted">{simPanelOpen ? '▾' : '▴'}</span>
          </button>

          {simPanelOpen && (
            <div className="p-4 bg-white">
              {simState === 'idle' && (
                <div className="flex flex-col gap-2">
                  <button
                    className="w-full py-2.5 rounded-xl text-sm font-medium border border-border transition-colors hover:bg-cream text-muted"
                  >
                    Normal readings
                  </button>
                  <button
                    onClick={runSpike}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all transform hover:scale-[1.02]"
                    style={{ background: 'var(--color-tomato)', boxShadow: '0 4px 12px rgba(242,107,79,0.35)' }}
                  >
                    🌡 Simulate cooling failure
                  </button>
                </div>
              )}

              {simState === 'running' && (
                <div className="space-y-4 py-2">
                   <div className="text-center animate-pulse text-sm font-medium text-tomato">
                     Running simulation...
                   </div>
                </div>
              )}

              {simState === 'done' && (
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="w-10 h-10 rounded-full bg-fresh-bg flex items-center justify-center text-lg text-leaf mb-1">
                    ✓
                  </div>
                  <p className="text-xs font-medium text-center text-leaf">
                    Simulation finished
                  </p>
                  <button
                    onClick={() => setSimState('idle')}
                    className="w-full mt-2 py-2 rounded-xl text-xs font-medium border border-border transition-colors hover:bg-cream text-muted"
                  >
                    Reset demo
                  </button>
                  <details className="w-full mt-2 group border-t border-border pt-2 text-left cursor-pointer">
                     <summary className="text-[10px] text-muted outline-none list-none group-hover:text-leaf transition-colors">
                        Why products differ: each crop ages at its own rate <span className="float-right group-open:rotate-180 transition-transform">▾</span>
                     </summary>
                     <p className="text-[10px] text-muted mt-2">
                        Strawberries (tRef=2°C) degrade much faster than Bananas (14°C) under identical 38°C transit heating due to their Q10 kinetic profile.
                     </p>
                  </details>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
