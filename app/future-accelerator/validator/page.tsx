'use client'

import Link from 'next/link'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { RefreshCw, RotateCcw, Send } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { api, trackEvent } from '@/components/fa/client'
import { DemoBadge, ErrorNote, Spinner, TypingDots } from '@/components/fa/parts'
import { Composer } from '@/components/fa/composer'
import { EmailReportButton } from '@/components/fa/email-report'
import { ReportSections, ScoreSummary, Scorecard } from '@/components/fa/report-view'
import { BOOKING_URL, WAR_ROOM_URL } from '@/lib/fa/quick'
import { downloadValidationPdf } from '@/lib/fa/pdf'
import { recClass, ui } from '@/lib/fa/ui'
import type { FASession, Validation } from '@/lib/fa/types'

const SUGGESTIONS = [
  'Who is my most likely first paying customer?',
  'What is the biggest reason this could fail?',
  'How could I test this with $0 this week?',
  'Which pricing model would suit this best?',
  'How would I reach my first 10 customers?',
]

function warRoomLink(v: Validation) {
  const last = v.versions.at(-1)
  const q = new URLSearchParams({ hf_ref: v.id, hf_idea: v.title.slice(0, 120), utm_source: 'humanfirst', utm_medium: 'idea_validator', utm_campaign: 'future_accelerator' })
  if (last) {
    q.set('hf_score', String(last.report.total))
    q.set('hf_rec', last.report.recommendation)
  }
  return `${WAR_ROOM_URL}?${q.toString()}`
}

// ---------------------------------------------------------------- start screen
function StartScreen({ onCreated }: { onCreated: (v: Validation, auto?: boolean) => void }) {
  const params = useSearchParams()
  const [session, setSession] = useState<FASession | null>(null)
  const [mode, setMode] = useState<'live' | 'demo'>('live')
  const [ideaId, setIdeaId] = useState<string>('')
  const [f, setF] = useState({ title: '', description: '', url: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existing, setExisting] = useState<Validation[]>([])

  useEffect(() => {
    api<{ session: FASession; aiMode: 'live' | 'demo' }>('/api/fa/session').then((r) => {
      setSession(r.session)
      setMode(r.aiMode)
      const want = params.get('idea')
      const idea = r.session.ideas.find((i) => i.id === want)
      if (idea) pick(idea.id, r.session)
      // "Quick check first" from the results: start the analysis straight away.
      if (idea && params.get('auto') === '1') {
        setBusy(true)
        api<{ validation: Validation }>('/api/fa/validator', {
          json: { action: 'create', ideaId: idea.id, title: idea.idea, description: `${idea.description} Problem: ${idea.problem} Target audience: ${idea.audience}.` },
        })
          .then((x) => onCreated(x.validation, true))
          .catch((e) => { setError((e as Error).message); setBusy(false) })
      }
    }).catch(() => {})
    api<{ validations: Validation[] }>('/api/fa/validator').then((r) => setExisting(r.validations)).catch(() => {})
  }, [params]) // eslint-disable-line react-hooks/exhaustive-deps

  function pick(id: string, s = session) {
    setIdeaId(id)
    const idea = s?.ideas.find((i) => i.id === id)
    if (idea) setF({ title: idea.idea, description: `${idea.description} Problem: ${idea.problem} Target audience: ${idea.audience}.`, url: '' })
    else setF({ title: '', description: '', url: '' })
  }

  async function start(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const r = await api<{ validation: Validation }>('/api/fa/validator', { json: { action: 'create', ideaId: ideaId || undefined, ...f } })
      onCreated(r.validation)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const top = session ? session.topIdeas.map((id) => session.ideas.find((i) => i.id === id)).filter(Boolean) : []
  const others = session ? session.ideas.filter((i) => !session.topIdeas.includes(i.id)) : []

  return (
    <>
      <div className="max-w-3xl mb-12">
        <div className="flex items-center gap-3 mb-5"><p className={ui.eyebrow}>HUMANFIRST AI BUSINESS IDEA VALIDATOR</p><DemoBadge mode={mode} /></div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[0.95] mb-7">IS YOUR BUSINESS IDEA ACTUALLY WORTH BUILDING?</h1>
        <p className="text-lg md:text-xl text-gray-300 leading-relaxed">Let&apos;s examine your idea, understand the market, identify potential customers, uncover risks, and find out what it would take to turn your idea into a viable business.</p>
      </div>

      <form onSubmit={start} className={`${ui.card} p-5 md:p-8 max-w-4xl`}>
        {(top.length > 0 || others.length > 0) && (
          <div className="mb-6">
            <label className={ui.label} htmlFor="v-pick">CHOOSE ONE OF YOUR BUSINESS IDEAS</label>
            <select id="v-pick" className={ui.input} value={ideaId} onChange={(e) => pick(e.target.value)}>
              <option value="">✍️ Enter a new idea instead</option>
              {top.length > 0 && <optgroup label="My top 5">{top.map((i) => <option key={i!.id} value={i!.id}>{i!.idea}</option>)}</optgroup>}
              {others.length > 0 && <optgroup label="Other generated ideas">{others.map((i) => <option key={i.id} value={i.id}>{i.idea}</option>)}</optgroup>}
            </select>
          </div>
        )}
        <div className="grid gap-4">
          <div><label className={ui.label} htmlFor="v-title">IDEA NAME</label><input id="v-title" className={ui.input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={140} placeholder="e.g. Weekend coding club for 10–14 year olds" /></div>
          <div><label className={ui.label} htmlFor="v-desc">DESCRIBE THE IDEA (EDIT FREELY)</label><textarea id="v-desc" rows={4} className={ui.input} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={2000} placeholder="What is it, who is it for, and what problem does it solve?" /></div>
          <div><label className={ui.label} htmlFor="v-url">EXISTING WEBSITE OR PRODUCT URL (OPTIONAL)</label><input id="v-url" className={ui.input} value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://" /></div>
        </div>
        <div className="mt-6 space-y-4">
          <ErrorNote error={error} />
          <button type="submit" className={ui.btn} disabled={busy || f.title.trim().length < 3 || f.description.trim().length < 10}>{busy ? 'STARTING…' : 'VALIDATE MY BUSINESS IDEA'}</button>
          {session?.unfairAdvantage && <p className="text-xs text-gray-500">Your Future Accelerator profile (5 U&apos;s, unfair advantage, location) is shared with the advisor so you don&apos;t have to repeat yourself.</p>}
        </div>
      </form>

      {existing.length > 0 && (
        <div className="mt-12">
          <h2 className={`${ui.h3} mb-4`}>YOUR PREVIOUS VALIDATIONS</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {existing.map((v) => {
              const last = v.versions.at(-1)?.report
              return (
                <Link key={v.id} href={`/future-accelerator/validator?id=${v.id}`} className={`${ui.card} block p-5 transition-all duration-300 hover:border-[#D4A017]`}>
                  <p className="text-white font-bold mb-2">{v.title}</p>
                  {last ? <span className={`inline-block rounded px-2 py-1 text-xs font-bold ${recClass(last.recommendation)}`}>{last.total}/100 · {last.recommendation}</span> : <span className="text-xs text-gray-400">In progress</span>}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------- workspace
function ValidatorWorkspace({ id }: { id: string }) {
  const [v, setV] = useState<Validation | null>(null)
  const [mode, setMode] = useState<'live' | 'demo'>('live')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<{ msg: string; retry?: () => void } | null>(null)
  const [ver, setVer] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const params = useSearchParams()
  const autoRan = useRef(false)
  useEffect(() => {
    if (!v || autoRan.current || params.get('auto') !== '1' || v.versions.length) return
    autoRan.current = true
    act({ action: 'report' }, 'Researching the market and scoring your idea… this can take a minute or two.')
  }, [v]) // eslint-disable-line react-hooks/exhaustive-deps
  const [draft, setDraft] = useState({ title: '', description: '' })
  const endRef = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    api<{ validation: Validation; aiMode: 'live' | 'demo' }>(`/api/fa/validator?id=${encodeURIComponent(id)}`)
      .then((r) => { setV(r.validation); setMode(r.aiMode) })
      .catch((e) => setError({ msg: e.message, retry: load }))
  }, [id])
  useEffect(load, [load])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [v?.messages.length, busy])

  async function act(body: Record<string, unknown>, label: string) {
    const go = async () => {
      setBusy(label)
      setError(null)
      try {
        const r = await api<{ validation: Validation; aiMode: 'live' | 'demo' }>('/api/fa/validator', { json: { id, ...body } })
        setV(r.validation)
        setMode(r.aiMode)
        if (body.action === 'report') setVer(null)
      } catch (e) {
        setError({ msg: (e as Error).message, retry: go })
      } finally {
        setBusy(null)
      }
    }
    await go()
  }

  if (!v) return error ? <ErrorNote error={error.msg} onRetry={error.retry} /> : <Spinner label="Loading validation…" />
  const shownVersion = ver ? v.versions.find((x) => x.version === ver) : v.versions.at(-1)
  const r = shownVersion?.report
  const send = (content: string) => { if (content.trim()) act({ action: 'message', content: content.trim() }, 'Your advisor is thinking…') }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-3"><p className={ui.eyebrowSm}>HUMANFIRST AI BUSINESS IDEA VALIDATOR</p><DemoBadge mode={mode} /></div>
          {editing ? (
            <div className="space-y-3">
              <input className={ui.input} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={140} aria-label="Idea name" />
              <textarea rows={3} className={ui.input} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={2000} aria-label="Idea description" />
              <div className="flex gap-3">
                <button className={ui.btnSm} disabled={!!busy} onClick={() => { setEditing(false); act({ action: 'report', title: draft.title, description: draft.description }, 'Re-assessing your updated idea with fresh research… this can take a minute or two.') }}>SAVE & RE-ASSESS</button>
                <button className={ui.btnGhost} onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-3xl md:text-5xl font-black leading-[0.95] mb-3">{v.title}</h1>
              <p className="text-gray-400">{v.description}</p>
              <button className="mt-2 text-xs text-gray-400 hover:text-[#D4A017]" onClick={() => { setDraft({ title: v.title, description: v.description }); setEditing(true) }}>✎ Edit idea</button>
            </>
          )}
        </div>
        <Link href="/future-accelerator/validator" className={ui.btnGhost}>+ New idea</Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        {/* Advisor chat */}
        <div className={`${ui.card} flex flex-col`}>
          <div className="flex items-center justify-between border-b border-gray-800 px-5 py-3">
            <p className="font-black text-white">HumanFirst Business Advisor</p>
            <div className="flex gap-3">
              <button className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-[#D4A017] disabled:opacity-50" disabled={!!busy} onClick={() => act({ action: 'regenerate' }, 'Rewriting the last reply…')}><RefreshCw className="h-3 w-3" /> Regenerate</button>
              <button className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-[#D4A017] disabled:opacity-50" disabled={!!busy} onClick={() => confirm('Clear this conversation and start again? Saved reports are kept.') && act({ action: 'restart' }, 'Restarting…')}><RotateCcw className="h-3 w-3" /> Restart</button>
            </div>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-5 max-h-[560px]">
            {v.messages.slice(1).map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end"><div className="max-w-[85%] rounded-lg border border-[#D4A017]/40 px-4 py-3 text-sm text-white whitespace-pre-line" style={{ backgroundColor: 'rgba(212,160,23,0.1)' }}>{m.content}</div></div>
              ) : (
                <div key={i} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#D4A017] text-[11px] font-black text-black" aria-hidden>HF</div>
                  <div className="rounded-lg border border-gray-800 bg-black px-4 py-3 text-sm text-gray-200 leading-relaxed whitespace-pre-line">{m.content}</div>
                </div>
              ),
            )}
            {busy && <TypingDots label={busy.replace(/…$/, '')} />}
            <div ref={endRef} />
          </div>
          <div className="border-t border-gray-800 p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((q) => <button key={q} disabled={!!busy} onClick={() => send(q)} className="rounded border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:border-[#D4A017] hover:text-[#D4A017] disabled:opacity-50">{q}</button>)}
            </div>
            <Composer placeholder="Answer the advisor or ask a question…" disabled={!!busy} onSend={(t) => send(t)} />
            <p className="text-[11px] text-gray-500">Enter to send · Shift + Enter for a new line</p>
          </div>
        </div>

        {/* Assessment */}
        <div className="space-y-4">
          <div className={`${ui.card} p-5`}>
            <p className="text-sm text-gray-300 mb-4">
              {v.versions.length
                ? 'Answer more of the advisor\'s questions, record real experiment results, or edit the idea — then re-assess.'
                : 'Answer a few of the advisor\'s questions first for a sharper result. When ready, generate the full report — it researches the market live and scores the idea.'}
            </p>
            <button className={ui.btn} disabled={!!busy} onClick={() => act({ action: 'report' }, 'Researching the market and scoring your idea… this can take a minute or two.')}>
              {v.versions.length ? 'RE-ASSESS MY IDEA' : 'GENERATE VALIDATION REPORT'}
            </button>
            {v.versions.length > 1 && (
              <div className="mt-5">
                <p className={`${ui.eyebrowSm} mb-2`}>VERSION HISTORY</p>
                <div className="flex flex-wrap gap-2">
                  {v.versions.map((x, i) => {
                    const prev = v.versions[i - 1]?.report.total
                    const delta = prev != null ? x.report.total - prev : null
                    const active = (ver ?? v.versions.at(-1)!.version) === x.version
                    return (
                      <button key={x.version} onClick={() => setVer(x.version)} className={active ? ui.btnSm : ui.btnGhost} title={x.title}>
                        v{x.version}: {x.report.total} {delta != null && delta !== 0 ? `(${delta > 0 ? '+' : ''}${delta})` : ''}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <ErrorNote error={error?.msg ?? null} onRetry={error?.retry} />
          {r && (
            <>
              <ScoreSummary r={r} />
              <Scorecard r={r} />
              <div className="flex flex-wrap gap-3">
                <button className={ui.btnOutlineSm} onClick={() => downloadValidationPdf(v, ver).then(() => trackEvent('pdf_downloaded', { kind: 'validation' })).catch((e) => setError({ msg: (e as Error).message }))}>DOWNLOAD REPORT (PDF)</button>
                <EmailReportButton validationId={v.id} version={ver} />
                <Link href={`/future-accelerator/validator/report?id=${v.id}${ver ? `&v=${ver}` : ''}`} className={ui.btnGhost}>View full report</Link>
                <Link href="/future-accelerator/dashboard" className={ui.btnGhost}>Saved to my dashboard</Link>
              </div>
            </>
          )}
        </div>
      </div>

      {r && shownVersion && (
        <>
          <ReportSections r={r} />

          {/* Real-world validation tracker */}
          <div>
            <h2 className={`${ui.h3} mb-2`}>REAL-WORLD VALIDATION TRACKER</h2>
            <p className="text-gray-400 mb-4">AI analysis can&apos;t prove customers will buy. Run these experiments, record what actually happened, then re-assess — real results outweigh AI assumptions.</p>
            <div className="space-y-3">
              {(v.versions.at(-1)?.report.experiments ?? []).map((e) => <ExperimentRow key={e.id} e={e} disabled={!!busy || shownVersion.version !== v.versions.at(-1)!.version} onSave={(d) => act({ action: 'experiment', experimentId: e.id, ...d }, 'Saving result…')} />)}
            </div>
          </div>

          {/* War Room conversion */}
          <div className="rounded-lg border border-[#D4A017] bg-[#111] p-8 md:p-12">
            <p className={`${ui.eyebrow} mb-4`}>PHASE II — FOUNDER NEXT</p>
            <h2 className="text-3xl md:text-5xl font-black leading-[0.95] mb-5">YOUR IDEA HAS BEEN ANALYZED. NOW IT&apos;S TIME TO PRESSURE-TEST IT.</h2>
            <p className="text-lg text-gray-300 mb-8 max-w-3xl">AI can help you understand the opportunity. War Room helps you challenge your assumptions, strengthen your strategy, and move towards execution — a year of entrepreneurship in one hour, and a 30-day plan toward your first customer.</p>
            <div className="flex flex-wrap gap-3">
              <a href={warRoomLink(v)} target="_blank" rel="noopener noreferrer" className={ui.btn} onClick={() => trackEvent('war_room_clicked', { from: 'validator', score: r.total, recommendation: r.recommendation })}>TAKE YOUR IDEA TO WAR ROOM</a>
              <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className={ui.btnOutline} onClick={() => trackEvent('booking_clicked', { from: 'validator' })}>BOOK A CALL WITH KK</a>
              <Link href="/future-accelerator" className={ui.btnOutline}>BACK TO MY RESULTS</Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ExperimentRow({ e, onSave, disabled }: { e: NonNullable<Validation['versions'][number]['report']['experiments']>[number]; onSave: (d: { actualResult: string; meaning?: string; nextAction?: string }) => void; disabled: boolean }) {
  const [d, setD] = useState({ actualResult: e.actualResult ?? '', meaning: e.meaning ?? '', nextAction: e.nextAction ?? '' })
  const [open, setOpen] = useState(false)
  return (
    <div className={`${ui.card} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-[240px]">
          <p className="font-black text-white mb-1">{e.experiment} {e.actualResult && <span className="ml-2 text-[11px] tracking-wider text-[#D4A017]">RESULT RECORDED</span>}</p>
          <div className="grid gap-1 md:grid-cols-2 text-sm text-gray-300">
            <p><span className="text-gray-500">Hypothesis: </span>{e.hypothesis}</p>
            <p><span className="text-gray-500">Audience: </span>{e.audience}</p>
            <p><span className="text-gray-500">Action: </span>{e.action}</p>
            <p><span className="text-gray-500">Expected evidence: </span>{e.expectedEvidence}</p>
          </div>
        </div>
        <button className={ui.btnGhost} onClick={() => setOpen(!open)}>{open ? 'Close' : e.actualResult ? 'Edit result' : 'Record result'}</button>
      </div>
      {open && (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div><label className={ui.label} htmlFor={`${e.id}-actualResult`}>ACTUAL RESULT</label><textarea id={`${e.id}-actualResult`} rows={2} className={ui.input} value={d.actualResult} onChange={(x) => setD({ ...d, actualResult: x.target.value })} maxLength={1500} /></div>
          <div><label className={ui.label} htmlFor={`${e.id}-meaning`}>WHAT IT MEANS</label><textarea id={`${e.id}-meaning`} rows={2} className={ui.input} value={d.meaning} onChange={(x) => setD({ ...d, meaning: x.target.value })} maxLength={1500} /></div>
          <div><label className={ui.label} htmlFor={`${e.id}-nextAction`}>NEXT ACTION</label><textarea id={`${e.id}-nextAction`} rows={2} className={ui.input} value={d.nextAction} onChange={(x) => setD({ ...d, nextAction: x.target.value })} maxLength={1500} /></div>
          <div className="md:col-span-3"><button className={ui.btnSm} disabled={disabled || !d.actualResult.trim()} onClick={() => { onSave(d); setOpen(false) }}>SAVE RESULT</button></div>
        </div>
      )}
    </div>
  )
}

function ValidatorRouter() {
  const params = useSearchParams()
  const router = useRouter()
  const id = params.get('id')
  return id ? <ValidatorWorkspace id={id} /> : <StartScreen onCreated={(v, auto) => router.push(`/future-accelerator/validator?id=${v.id}${auto ? '&auto=1' : ''}`)} />
}

export default function ValidatorPage() {
  return (
    <main className="bg-black text-white min-h-screen">
      <Header />
      <section className="px-4 md:px-6 py-16 md:py-20">
        <div className="max-w-6xl mx-auto">
          <Suspense fallback={<Spinner />}>
            <ValidatorRouter />
          </Suspense>
        </div>
      </section>
      <Footer />
    </main>
  )
}
