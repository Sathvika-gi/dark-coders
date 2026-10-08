"use client";
import React from 'react'

type FreshnessState = 'fresh' | 'caution' | 'critical'

interface FreshnessDialProps {
  totalHours: number
  remainingHours: number
  size?: number
  label?: string
  animate?: boolean
}

function getState(ratio: number): FreshnessState {
  if (ratio > 0.5) return 'fresh'
  if (ratio > 0.2) return 'caution'
  return 'critical'
}

export function formatTime(hours: number): string {
  if (hours >= 24) {
    const d = Math.floor(hours / 24)
    const h = Math.floor(hours % 24)
    return `${d}d ${h}h`
  }
  if (hours >= 1) return `${Math.floor(hours)}h`
  return `<1h`
}

const STATE_COLORS: Record<FreshnessState, { arc: string; text: string; bg: string; icon: string }> = {
  fresh: { arc: 'var(--color-fresh)', text: 'var(--color-leaf)', bg: 'var(--color-fresh-bg)', icon: '🌿' },
  caution: { arc: 'var(--color-caution)', text: '#B87A1A', bg: 'var(--color-caution-bg)', icon: '⚡' },
  critical: { arc: 'var(--color-critical)', text: '#C0181D', bg: 'var(--color-critical-bg)', icon: '🔥' },
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const toRad = (a: number) => (a * Math.PI) / 180
  const x1 = cx + r * Math.cos(toRad(startAngle))
  const y1 = cy + r * Math.sin(toRad(startAngle))
  const x2 = cx + r * Math.cos(toRad(endAngle))
  const y2 = cy + r * Math.sin(toRad(endAngle))
  const large = endAngle - startAngle > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
}

function describeTicks(cx: number, cy: number, r: number, count: number, startAngle: number, endAngle: number) {
  const ticks = []
  for (let i = 0; i <= count; i++) {
    const angle = startAngle + (i / count) * (endAngle - startAngle)
    const rad = (angle * Math.PI) / 180
    const inner = r - 5
    const outer = r + 1
    const x1 = cx + inner * Math.cos(rad)
    const y1 = cy + inner * Math.sin(rad)
    const x2 = cx + outer * Math.cos(rad)
    const y2 = cy + outer * Math.sin(rad)
    ticks.push(`M ${x1} ${y1} L ${x2} ${y2}`)
  }
  return ticks.join(' ')
}

export function FreshnessDial({ totalHours, remainingHours, size = 160, label, animate = false }: FreshnessDialProps) {
  const ratio = Math.min(1, Math.max(0, remainingHours / totalHours))
  const state = getState(ratio)
  const colors = STATE_COLORS[state]

  const cx = size / 2
  const cy = size * 0.58
  const r = size * 0.38

  const START = 200
  const END = 340
  const RANGE = END - START

  const filledEnd = START + Math.max(0, ratio) * RANGE

  const trackPath = describeArc(cx, cy, r, START, END)
  const arcPath = ratio > 0 ? describeArc(cx, cy, r, START, filledEnd) : ''
  const tickPath = describeTicks(cx, cy, r, 20, START, END)

  const iconSize = size * 0.18

  return (
    <div
      className="relative flex flex-col items-center gap-1"
      style={{ width: size }}
    >
      <svg width={size} height={size * 0.95} style={{ overflow: 'visible' }}>
        {/* Track */}
        <path d={trackPath} fill="none" className="stroke-border" strokeWidth={size * 0.07} strokeLinecap="round" />

        {/* Filled arc */}
        {arcPath && (
          <path
            d={arcPath}
            fill="none"
            stroke={colors.arc}
            strokeWidth={size * 0.07}
            strokeLinecap="round"
            style={{ transition: animate ? 'stroke-dashoffset 0.8s ease-out' : 'none' }}
          />
        )}

        {/* Tick marks */}
        <path d={tickPath} stroke="#D4CCBB" strokeWidth={0.75} fill="none" opacity={0.5} />

        {/* Produce icon circle */}
        <circle cx={cx} cy={cy - r * 0.42} r={iconSize * 0.85} fill={colors.bg} />
        <text
          x={cx}
          y={cy - r * 0.42 + iconSize * 0.35}
          textAnchor="middle"
          fontSize={iconSize * 0.9}
          style={{ userSelect: 'none' }}
        >
          {colors.icon}
        </text>

        {/* Time remaining */}
        <text
          x={cx}
          y={cy + size * 0.20}
          textAnchor="middle"
          fontSize={size * 0.185}
          fill={colors.text}
          fontWeight={500}
          className={`font-serif ${state === 'critical' ? 'animate-pulse-ring' : ''}`}
        >
          {formatTime(remainingHours)}
        </text>

        {/* Label */}
        <text
          x={cx}
          y={cy + size * 0.32}
          textAnchor="middle"
          fontSize={size * 0.09}
          fill="var(--color-muted)"
          className="font-sans"
        >
          {label || 'freshness left'}
        </text>
      </svg>

      {/* State chip */}
      <div
        className={`px-2 py-0.5 rounded-full text-xs font-medium font-sans z-10 ${
          state === 'fresh'
            ? 'bg-fresh-bg text-leaf'
            : state === 'caution'
            ? 'bg-caution-bg text-[#B87A1A]'
            : 'bg-critical-bg text-[#C0181D]'
        }`}
      >
        {state === 'fresh' ? '● Fresh' : state === 'caution' ? '● Caution' : '● Critical'}
      </div>
    </div>
  )
}
