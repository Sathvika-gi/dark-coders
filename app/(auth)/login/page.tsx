"use client";
import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedRole, setSelectedRole] = useState<'distributor' | 'retailer' | null>(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleContinue = async () => {
    if (!selectedRole || !password) return
    setLoading(true)
    setErrorMsg('')
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole, password })
      })
      if (!res.ok) {
        throw new Error('Invalid password')
      }
      
      const next = searchParams.get('next')
      if (next) {
        router.replace(next)
      } else {
        router.replace(selectedRole === 'distributor' ? '/dashboard' : '/marketplace')
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErrorMsg(e.message || 'Login failed')
      } else {
        setErrorMsg('Login failed')
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-cream font-sans">
      {/* Left panel */}
      <div
        className="relative flex-1 flex flex-col justify-between p-10 md:p-14 overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #2F6B45 0%, #1F5535 60%, #163D28 100%)' }}
      >
        {/* Leaf watermark */}
        <div
          className="absolute inset-0 leaf-pattern opacity-20 pointer-events-none"
          aria-hidden="true"
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg font-serif"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}
            >
              A
            </div>
            <span className="text-white text-xl font-semibold font-serif">
              AgroSense
            </span>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 py-12 md:py-0">
          <h1
            className="text-4xl md:text-5xl font-medium leading-tight mb-5 text-white font-serif"
          >
            Know what&apos;s fresh.<br />
            Before it&apos;s<br />
            too late.
          </h1>
          <p className="text-base max-w-xs" style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            Real-time cold-chain tracking. Automatic markdown pricing. Zero waste.
          </p>

          {/* Stats row */}
          <div className="flex gap-8 mt-10">
            {[
              { value: '₹2.4Cr', label: 'saved this month' },
              { value: '98%', label: 'freshness accuracy' },
              { value: '340+', label: 'shipments live' },
            ].map(s => (
              <div key={s.label}>
                <div
                  className="text-2xl font-semibold text-white tabular-nums font-serif"
                >
                  {s.value}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Powering India&apos;s cold chain since 2023
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div
        className="flex flex-col flex-1 items-center justify-center p-8 md:p-12 bg-cream"
      >
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2
              className="text-2xl font-medium mb-2 font-serif text-green-black"
            >
              Sign in
            </h2>
            <p className="text-sm text-muted">
              Choose your role to get started
            </p>
          </div>

          {/* Role cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {(['distributor', 'retailer'] as const).map(role => {
              const isSelected = selectedRole === role
              return (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className="flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 transition-all duration-150 text-left bg-card"
                  style={{
                    borderColor: isSelected ? 'var(--color-leaf)' : 'var(--color-border)',
                    background: isSelected ? 'var(--color-sage-light)' : 'white',
                    boxShadow: isSelected
                      ? '0 0 0 3px rgba(31,107,69,0.1)'
                      : '0 8px 24px rgba(31,42,31,0.06)',
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all"
                    style={{ background: isSelected ? '#D1E9DC' : '#F5F5F0' }}
                  >
                    {role === 'distributor' ? '🚛' : '🏪'}
                  </div>
                  <div>
                    <div
                      className="font-semibold text-sm capitalize"
                      style={{ color: isSelected ? 'var(--color-leaf)' : 'var(--color-green-black)' }}
                    >
                      {role}
                    </div>
                    <div className="text-xs mt-0.5 text-muted">
                      {role === 'distributor' ? 'Manage shipments' : 'Browse deals'}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Password */}
          <div className="mb-5">
            <label
              className="block text-sm font-medium mb-1.5 text-green-black"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 rounded-xl border border-border text-sm transition-all bg-card text-green-black outline-none focus:border-leaf"
              onKeyDown={e => e.key === 'Enter' && handleContinue()}
            />
            {errorMsg && (
              <p className="text-sm mt-2 text-critical font-medium">
                {errorMsg}
              </p>
            )}
          </div>

          {/* Continue button */}
          <button
            onClick={handleContinue}
            disabled={!selectedRole || !password || loading}
            className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-150 flex items-center justify-center gap-2"
            style={{
              background: (selectedRole && password) ? 'var(--color-leaf)' : '#D4CCBB',
              cursor: (selectedRole && password) ? 'pointer' : 'not-allowed',
              boxShadow: (selectedRole && password) ? '0 4px 14px rgba(31,107,69,0.3)' : 'none',
            }}
          >
            {loading ? (
              <>
                <svg className="animate-spin-slow w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Signing in…
              </>
            ) : (
              'Continue →'
            )}
          </button>

          <p className="text-center text-xs mt-5 text-muted">
            Protected by end-to-end encryption
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-cream flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </React.Suspense>
  )
}
