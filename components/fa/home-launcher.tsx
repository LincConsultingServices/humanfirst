'use client'

import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Accelerator, DISMISS_KEY } from './accelerator'

// The first screen on humanfirstbykk.com: the Future Accelerator, full screen.
// Closing it (or "Continue to HumanFirst homepage") reveals the normal homepage for the
// rest of this browser session; it opens again on the next visit.
export function HomeLauncher() {
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    let dismissed = false
    try {
      dismissed = sessionStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      /* storage unavailable: still open */
    }
    if (!dismissed) setOpen(true)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.key === 'Escape' && !['TEXTAREA', 'INPUT', 'SELECT'].includes(el.tagName)) close()
    }
    window.addEventListener('keydown', onKey)
    const t = setTimeout(() => setShown(true), 20)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
      clearTimeout(t)
    }
  }, [open, close])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="HumanFirst Future Accelerator"
      className={`fixed inset-0 z-[60] flex flex-col bg-black text-white transition-opacity duration-300 motion-reduce:transition-none ${shown ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="flex items-center justify-between border-b border-gray-800 px-4 md:px-6 py-3">
        <div className="flex items-center gap-3">
          <img src="/humanfirst-logo.png" alt="HUMANFIRST BY KK" className="h-8 md:h-10 w-auto" />
          <span className="hidden sm:inline text-xs tracking-[0.18em] text-gray-400">FUTURE ACCELERATOR 2.0</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:flex items-center gap-2 text-xs text-gray-400"><span className="h-2 w-2 rounded-full bg-[#D4A017]" aria-hidden /> AI online</span>
          <button onClick={close} className="rounded p-2 text-gray-400 hover:text-[#D4A017]" aria-label="Close and go to the website">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <Accelerator mode="overlay" onExit={close} />
      </div>
    </div>
  )
}
