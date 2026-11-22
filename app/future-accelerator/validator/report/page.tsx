'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { api, trackEvent } from '@/components/fa/client'
import { ErrorNote, Spinner } from '@/components/fa/parts'
import { PrintStyles } from '@/components/fa/print-styles'
import { EmailReportButton } from '@/components/fa/email-report'
import { ReportSections, ScoreSummary, Scorecard } from '@/components/fa/report-view'
import { downloadValidationPdf } from '@/lib/fa/pdf'
import { ui } from '@/lib/fa/ui'
import type { Validation } from '@/lib/fa/types'

function Content() {
  const params = useSearchParams()
  const [v, setV] = useState<Validation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const id = params.get('id') ?? ''
  useEffect(() => {
    api<{ validation: Validation }>(`/api/fa/validator?id=${encodeURIComponent(id)}`).then((r) => setV(r.validation)).catch((e) => setError(e.message))
  }, [id])
  const ver = Number(params.get('v')) || null
  const version = v ? (ver ? v.versions.find((x) => x.version === ver) : v.versions.at(-1)) : null
  async function download() {
    if (!v) return
    setSaving(true)
    try {
      await downloadValidationPdf(v, version?.version)
      trackEvent('pdf_downloaded', { kind: 'validation' })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (error) return <ErrorNote error={error} />
  if (!v) return <Spinner label="Loading report…" />
  if (!version) return <p className="text-gray-300">This idea has no validation report yet. <Link className={ui.link} href={`/future-accelerator/validator?id=${v.id}`}>Go back</Link></p>
  const r = version.report
  const header = (print: boolean) => (
    <div className={print ? 'mb-6 border-b-4 border-[#D4A017] pb-4' : 'mb-8'}>
      <p className={print ? 'text-xs tracking-[0.2em] text-[#9a7410] font-bold' : ui.eyebrow}>HUMANFIRST — BUSINESS IDEA VALIDATION REPORT</p>
      <h1 className={print ? 'text-3xl font-black mt-1' : 'text-4xl md:text-5xl font-black leading-[0.95] mt-3'}>{version.title}</h1>
      <p className={print ? 'text-sm text-gray-700 mt-2' : 'text-gray-400 mt-3'}>{version.description}</p>
      <p className={print ? 'text-[10px] text-gray-500 mt-1' : 'text-xs text-gray-500 mt-2'}>Version {version.version} · {new Date(version.at).toLocaleDateString()}{v.aiMode === 'demo' ? ' · Demo mode' : ''}</p>
    </div>
  )
  return (
    <>
      <div className="flex flex-wrap gap-3 mb-8">
        <button className={ui.btn} onClick={download} disabled={saving}>{saving ? 'PREPARING PDF…' : 'DOWNLOAD PDF'}</button>
        <EmailReportButton validationId={v.id} version={version.version} label="EMAIL ME THE PDF" className={ui.btnOutline} />
        <button className={ui.btnGhost} onClick={() => window.print()}>Print</button>
        <Link href={`/future-accelerator/validator?id=${v.id}`} className={ui.btnOutline}>BACK TO VALIDATOR</Link>
      </div>
      {header(false)}
      <div className="space-y-4">
        <ScoreSummary r={r} />
        <Scorecard r={r} />
        <ReportSections r={r} />
      </div>
      <div id="fa-print" className="hidden bg-white p-2 text-gray-900">
        {header(true)}
        <ScoreSummary r={r} print />
        <Scorecard r={r} print />
        <ReportSections r={r} print />
        <div className="mb-5 break-inside-avoid">
          <h3 className="text-[11px] tracking-[0.18em] text-[#9a7410] font-bold mb-2">REAL-WORLD EXPERIMENTS</h3>
          <ul className="text-sm space-y-2">
            {r.experiments.map((e) => <li key={e.id}><strong>{e.experiment}</strong> — {e.hypothesis}{e.actualResult ? ` · Result: ${e.actualResult}` : ''}</li>)}
          </ul>
        </div>
        <p className="text-[10px] text-gray-500">humanfirstbykk.com · Next step: pressure-test your idea in the War Room — enterthewarroom.humanfirstbykk.com</p>
      </div>
    </>
  )
}

export default function ValidationReportPage() {
  return (
    <main className="bg-black text-white min-h-screen">
      <PrintStyles />
      <Header />
      <section className="px-4 md:px-6 py-12 md:py-16">
        <div className="max-w-5xl mx-auto">
          <Suspense fallback={<Spinner />}><Content /></Suspense>
        </div>
      </section>
      <Footer />
    </main>
  )
}
