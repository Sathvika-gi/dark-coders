"use client";
import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export interface NavbarProps {
  role: 'distributor' | 'retailer'
}

export function Navbar({ role }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.replace('/login')
    } catch (e) {
      console.error('Logout failed', e)
    }
  }

  // Determine active tab based on pathname
  let activeTab = 'dashboard'
  if (pathname.includes('/shipments')) activeTab = 'shipments'
  if (pathname.includes('/marketplace')) activeTab = 'marketplace'

  return (
    <header
      className="sticky top-0 z-40 bg-white border-b border-border"
      style={{ boxShadow: '0 2px 8px rgba(31,42,31,0.04)' }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold font-serif bg-leaf"
          >
            A
          </div>
          <span
            className="text-lg font-semibold tracking-tight font-serif text-green-black"
          >
            AgroSense
          </span>
        </div>

        {/* Nav tabs - desktop */}
        {role === 'distributor' && (
          <nav className="hidden md:flex items-center gap-1 flex-1">
            <Link
              href="/dashboard"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-fresh-bg text-leaf'
                  : 'text-muted hover:text-green-black hover:bg-cream'
              }`}
            >
              Dashboard
            </Link>
            {/* Note: In Phase 5, Shipments might just be handled via Dashboard (as decided). Keeping tab for now to match reference. */}
          </nav>
        )}

        {role === 'retailer' && (
           <nav className="hidden md:flex items-center gap-1 flex-1">
            <Link
              href="/marketplace"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'marketplace'
                  ? 'bg-fresh-bg text-leaf'
                  : 'text-muted hover:text-green-black hover:bg-cream'
              }`}
            >
              Marketplace
            </Link>
          </nav>
        )}

        <div className="flex-1" />

        {/* Role badge */}
        <div
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-sage-light text-leaf"
        >
          <span>{role === 'distributor' ? '🚛' : '🏪'}</span>
          <span>{role === 'distributor' ? 'Distributor' : 'Retailer'}</span>
        </div>

        {/* Avatar + menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm text-white transition-transform hover:scale-105 bg-leaf"
          >
            {role === 'distributor' ? 'RK' : 'AM'}
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-11 w-48 bg-white rounded-xl border border-border py-1 animate-scale-in"
              style={{ boxShadow: '0 8px 24px rgba(31,42,31,0.1)' }}
            >
              <div className="px-4 py-2 border-b border-border">
                <div className="text-sm font-medium text-green-black">
                  {role === 'distributor' ? 'Raj Kumar' : 'Anita Mehta'}
                </div>
                <div className="text-xs text-muted">
                  {role === 'distributor' ? 'raj@freshcorp.in' : 'anita@localmart.in'}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm transition-colors hover:bg-cream text-critical"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
