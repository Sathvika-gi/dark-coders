"use client";
import React from 'react'

export interface KPITileProps {
  label: string
  value: string
  trend?: string
  trendUp?: boolean
  icon: string
  loading?: boolean
}

export function KPITile({ label, value, trend, trendUp, icon, loading }: KPITileProps) {
  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border card-shadow">
        <div className="skeleton h-8 w-8 rounded-lg mb-3" />
        <div className="skeleton h-8 w-20 mb-2" />
        <div className="skeleton h-4 w-24" />
      </div>
    )
  }

  return (
    <div
      className="bg-card rounded-2xl p-6 border border-border transition-shadow hover:shadow-lg card-shadow"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-4 bg-sage-light"
      >
        {icon}
      </div>
      <div
        className="text-[2rem] font-semibold tabular-nums leading-none mb-1 font-serif text-green-black"
      >
        {value}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-sm text-muted">{label}</span>
        {trend && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              background: trendUp ? 'var(--color-fresh-bg)' : 'var(--color-critical-bg)',
              color: trendUp ? 'var(--color-leaf)' : '#C0181D',
            }}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  )
}
