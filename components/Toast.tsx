"use client";
import React, { useEffect } from 'react'

interface ToastProps {
  message: string
  subtext?: string
  onView?: () => void
  onDismiss: () => void
  visible: boolean
}

export function Toast({ message, subtext, onView, onDismiss, visible }: ToastProps) {
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [visible, onDismiss])

  if (!visible) return null

  return (
    <div
      className="fixed top-6 right-6 z-50 flex items-start gap-3 bg-white rounded-2xl border px-4 py-3 animate-slide-in-top border-border"
      style={{
        boxShadow: '0 8px 24px rgba(31,42,31,0.12)',
        maxWidth: 340,
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 bg-critical-bg"
      >
        🍅
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-green-black">{message}</div>
        {subtext && <div className="text-xs mt-0.5 text-muted">{subtext}</div>}
      </div>
      <div className="flex items-center gap-2 ml-1">
        {onView && (
          <button
            onClick={onView}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors hover:bg-fresh-bg text-leaf"
          >
            View
          </button>
        )}
        <button
          onClick={onDismiss}
          className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors hover:bg-cream text-muted"
        >
          ×
        </button>
      </div>
    </div>
  )
}
