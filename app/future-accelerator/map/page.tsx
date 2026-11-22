'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { api, trackEvent } from '@/components/fa/client'
import { ErrorNote, MapView, Spinner } from '@/components/fa/parts'
import { PrintStyles } from '@/components/fa/print-styles'
import type { PublicUser } from '@/components/fa/auth-forms'
import { downloadMapPdf } from '@/lib/fa/pdf'
import { ui } from '@/lib/fa/ui'
import type { FASession } from '@/lib/fa/types'

function MapContent() {
  const params = useSearchParams()
  const [s, setS] = useState<FASession | null>(null)
  const [user, setUser] = useState<PublicUser | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = params.get('id')
    api<{ session: FASession; user: PublicUser | null }>(`/api/fa/session${id ? `?open=${encodeURIComponent(id)}` : ''}`)
      .then((r) => { setS(r.session); setUser(r.user) })
      .catch((e) => setError(e.message))
  }, [params])

  const [saving, setSaving] = useState(false)
  async function download() {
    if (!s) return
    setSaving(true)
    try {
      await downloadMapPdf(s, user?.profile)
      trackEvent('pdf_downloaded', { kind: 'map' })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (error) return <ErrorNote error={error} />
  if (!s) return <Spinner label="Loading your map…" />
  if (!s.map) {
    return (
      <div className={`${ui.card} p-8`}>
        <p className="text-white font-bold mb-4">You don&apos;t have a Career Accelerator Map yet.</p>
        <Link href="/future-accelerator" className={ui.btn}>CONTINUE MY FUTURE ACCELERATOR</Link>
      </div>
    )
  }
  return (
    <>
      <div className="flex flex-wrap gap-3 mb-8">
        <button className={ui.btn} onClick={download} disabled={saving}>{saving ? 'PREPARING PDF…' : 'DOWNLOAD PDF'}</button>
        <button className={ui.btnGhost} onClick={() => window.print()}>Print</button>
        <Link href="/future-accelerator" className={ui.btnOutline}>BACK TO MY JOURNEY</Link>
      </div>
      <MapView s={s} profile={user?.profile} />
      <div id="fa-print" className="hidden bg-white p-2">
        <MapView s={s} profile={user?.profile} print />
        <p className="mt-6 text-[10px] text-gray-500">humanfirstbykk.com · Phase 1 – Future Accelerator 2.0</p>
      </div>
    </>
  )
}

export default function MapPage() {
  return (
    <main className="bg-black text-white min-h-screen">
      <PrintStyles />
      <Header />
      <section className="px-4 md:px-6 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <Suspense fallback={<Spinner />}>
            <MapContent />
          </Suspense>
        </div>
      </section>
      <Footer />
    </main>
  )
}
