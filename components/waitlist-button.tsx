'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function WaitlistButton({ label, className }: { label: string; className: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleOpenChange = (next: boolean) => {
    // Keep the dialog open while a request is in flight.
    if (loading) return
    setOpen(next)
    if (!next) {
      setError(null)
      if (submitted) {
        setSubmitted(false)
        setEmail('')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError(null)

    const trimmed = email.trim()
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, website }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.success) {
        setError(data?.message || 'Something went wrong. Please try again.')
        return
      }

      setSubmitted(true)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="bg-[#111] text-white border-gray-800 p-7 md:p-9 [&>button]:text-gray-400 [&>button]:hover:text-white">
          <p className="text-xs tracking-[0.18em] text-[#D4A017]">CEO CITY</p>
          <DialogTitle className="text-3xl md:text-4xl font-black">Join the Waitlist</DialogTitle>

          {submitted ? (
            <DialogDescription className="text-gray-300 leading-relaxed" role="status">
              You&apos;re on the waitlist! We&apos;ll keep you updated.
            </DialogDescription>
          ) : (
            <>
              <DialogDescription className="text-gray-300 leading-relaxed">
                Leave your email and we&apos;ll let you know when CEO City opens.
              </DialogDescription>
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="waitlist-email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email address
                  </label>
                  <input
                    id="waitlist-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (error) setError(null)
                    }}
                    placeholder="you@example.com"
                    disabled={loading}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? 'waitlist-error' : undefined}
                    className="w-full rounded border border-gray-700 bg-black px-4 py-3 text-white placeholder:text-gray-500 focus:border-[#D4A017] focus:outline-none focus:ring-2 focus:ring-[#D4A017]/30 transition-all duration-300 disabled:opacity-60"
                  />
                </div>

                {/* Honeypot for bots; hidden from people and screen readers. */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="hidden"
                />

                {error && (
                  <p id="waitlist-error" role="alert" className="text-sm text-amber-500">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-block rounded bg-[#D4A017] px-6 py-3 text-sm font-medium text-black transition-all duration-300 hover:scale-105 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                >
                  {loading ? 'Joining…' : 'Join Waitlist'}
                </button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
