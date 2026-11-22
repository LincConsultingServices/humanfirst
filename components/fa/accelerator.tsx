'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ChevronDown, Loader2, MapPin, Plus } from 'lucide-react'
import {
  INTERESTS, LIMITS, SKILLS, SURVIVED, WALKED, guessLocation, helpsFor, locationLabel, warRoomUrl,
} from '@/lib/fa/quick'
import { downloadMapPdf } from '@/lib/fa/pdf'
import { ui } from '@/lib/fa/ui'
import type { CareerPath, FASession, Idea } from '@/lib/fa/types'
import { api, trackEvent } from './client'
import { AuthForms, type PublicUser } from './auth-forms'
import { DemoBadge, ErrorNote, HumanEdgeBars, RiskBadge } from './parts'

export const DISMISS_KEY = 'hf_fa_launcher_dismissed'
const DRAFT_KEY = 'hf_fa_draft'

type Screen = 'landing' | 'about' | 'working' | 'results'
type Loc = { city: string; state: string; country: string }
type Draft = { path?: CareerPath; interests: string[]; skills: string[]; helps: string[]; lived: string[]; walked: string[]; extra: string; location: Loc }

const emptyDraft = (): Draft => ({ path: 'founder', interests: [], skills: [], helps: [], lived: [], walked: [], extra: '', location: { city: '', state: '', country: '' } })

const hasResults = (s: FASession | null) => !!s && s.ideas.length > 0 && !!s.unfairAdvantage && !!s.map

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? { ...emptyDraft(), ...JSON.parse(raw) } : null
  } catch {
    return null
  }
}
function writeDraft(d: Draft | null) {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
    else localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* storage unavailable */
  }
}

// ---------------------------------------------------------------- main

export function Accelerator({ mode = 'page', onExit }: { mode?: 'page' | 'overlay'; onExit?: () => void }) {
  const [screen, setScreen] = useState<Screen>('landing')
  const [session, setSession] = useState<FASession | null>(null)
  const [user, setUser] = useState<PublicUser | null>(null)
  const [aiMode, setAiMode] = useState<'live' | 'demo'>('live')
  const [loaded, setLoaded] = useState(false)
  const [draft, setDraftState] = useState<Draft>(emptyDraft)
  const [error, setError] = useState<{ msg: string; retry?: () => void } | null>(null)
  const startedAt = useRef<number | null>(null)
  const top = useRef<HTMLDivElement>(null)
  const loadedOnce = useRef(false)

  const setDraft = useCallback((fn: (d: Draft) => Draft) => {
    setDraftState((d) => {
      const next = fn(d)
      writeDraft(next)
      return next
    })
  }, [])

  useEffect(() => {
    if (loadedOnce.current) return
    loadedOnce.current = true
    const d = readDraft()
    const loc = guessLocation()
    setDraftState(d ? { ...d, location: d.location?.country || d.location?.city ? d.location : loc } : { ...emptyDraft(), location: loc })
    api<{ session: FASession | null; user: PublicUser | null; aiMode: 'live' | 'demo' }>('/api/fa/session?peek=1')
      .then((r) => {
        setSession(r.session)
        setUser(r.user)
        setAiMode(r.aiMode)
        if (hasResults(r.session) && mode === 'page') setScreen('results')
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [mode])

  const go = (s: Screen) => {
    setError(null)
    setScreen(s)
    top.current?.scrollTo({ top: 0 })
  }

  async function generate(more = false) {
    const q = more && session?.quick ? { ...session.quick, walked: session.quick.walked ?? [], extra: session.quick.extra ?? '' } : draft
    const run = async () => {
      setError(null)
      go('working')
      try {
        const r = await api<{ session: FASession; aiMode: 'live' | 'demo' }>('/api/fa/ai', {
          json: {
            task: 'quick', path: 'founder', interests: q.interests, skills: q.skills, helps: q.helps,
            lived: q.lived, walked: q.walked, extra: q.extra || undefined, location: q.location, more,
          },
        })
        if (!more && startedAt.current) {
          trackEvent('survey_completed', { seconds: Math.round((Date.now() - startedAt.current) / 1000) })
          startedAt.current = null
        }
        setSession(r.session)
        setAiMode(r.aiMode)
        writeDraft(null)
        go('results')
      } catch (e) {
        setError({ msg: (e as Error).message, retry: run })
        go(more ? 'results' : 'about')
      }
    }
    await run()
  }

  async function restart() {
    setSession(null)
    setDraftState({ ...emptyDraft(), location: guessLocation() })
    writeDraft(null)
    try {
      // a fresh conversation for the next run (the old one stays in the account if saved)
      const r = await api<{ session: FASession }>('/api/fa/session?new=1')
      setSession(r.session.ideas.length ? r.session : null)
    } catch {
      /* the next generate creates one anyway */
    }
    go('about')
  }

  return (
    <div ref={top} className="h-full overflow-y-auto bg-black text-white">
      <div className="mx-auto w-full max-w-3xl px-4 md:px-6 py-10 md:py-16">
        {(screen === 'landing' || screen === 'results') && (
          <div className="mb-2 flex justify-end">
            {user ? (
              <Link href="/future-accelerator/dashboard" className="text-sm text-gray-400 hover:text-[#D4A017]">My account · {user.profile.fullName.split(' ')[0]}</Link>
            ) : (
              <span className="flex items-center gap-3 text-sm">
                <Link href="/future-accelerator/dashboard" className="text-gray-400 hover:text-[#D4A017]">Log in</Link>
                <Link href="/future-accelerator/dashboard?mode=register" className={ui.btnOutlineSm}>Create account</Link>
              </span>
            )}
          </div>
        )}
        {screen === 'landing' && (
          <Landing
            aiMode={aiMode}
            hasResults={hasResults(session)}
            onStart={() => {
              startedAt.current = Date.now()
              trackEvent('agent_started', { from: mode })
              go('about')
            }}
            onContinue={() => go('results')}
            onExit={onExit}
          />
        )}
        {screen === 'about' && (
          <AboutScreen draft={draft} setDraft={setDraft} onBack={() => go('landing')} onSubmit={() => generate(false)} error={error} />
        )}
        {screen === 'working' && <Working />}
        {screen === 'results' && session && hasResults(session) && (
          <Results
            s={session}
            user={user}
            aiMode={aiMode}
            mode={mode}
            error={error}
            setSession={setSession}
            setUser={setUser}
            onMore={() => generate(true)}
            onRestart={restart}
            onExit={onExit}
          />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- A. landing

function Landing({ aiMode, hasResults, onStart, onContinue, onExit }: {
  aiMode: 'live' | 'demo'; hasResults: boolean; onStart: () => void; onContinue: () => void; onExit?: () => void
}) {
  const [how, setHow] = useState(false)
  return (
    <div className="py-6 md:py-12">
      <div className="flex items-center gap-3 mb-5">
        <p className={ui.eyebrow}>FUTURE ACCELERATOR</p>
        <DemoBadge mode={aiMode} />
      </div>
      <h1 className={`${ui.h1} mb-6`}>DISCOVER YOUR NEXT OPPORTUNITY.</h1>
      <p className="text-lg md:text-xl text-gray-300 leading-relaxed mb-10 max-w-2xl">
        Find the business idea that fits your strengths, your experience and the problems you understand, then pitch it in the War Room.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {hasResults ? (
          <>
            <button className={ui.btn} onClick={onContinue}>SEE MY OPPORTUNITIES</button>
            <button className={ui.btnOutline} onClick={onStart}>START AGAIN</button>
          </>
        ) : (
          <button className={ui.btn} onClick={onStart}>DISCOVER MY OPPORTUNITIES</button>
        )}
        <button className={ui.btnGhost} onClick={() => setHow(!how)} aria-expanded={how}>How it works</button>
      </div>
      <p className="mt-4 text-xs text-gray-500">Free · under a minute · no sign-up needed to see your results</p>
      {how && (
        <ol className="mt-8 grid gap-3 md:grid-cols-3">
          {[
            ['Tap your 5 U\'s', 'What you love, how you help, what you learned, what you survived, the journey you walked. About 40 seconds.'],
            ['Get your best idea', 'We match you with ideas that fit you and write your pitch.'],
            ['Pitch it in the War Room', 'Take your idea and pitch into the War Room in one click.'],
          ].map(([t, d], i) => (
            <li key={t} className={`${ui.card} p-5`}>
              <p className={`${ui.eyebrowSm} mb-2`}>STEP {i + 1}</p>
              <p className="font-bold text-white mb-1">{t}</p>
              <p className="text-sm text-gray-400">{d}</p>
            </li>
          ))}
        </ol>
      )}
      {onExit && (
        <button onClick={onExit} className="mt-10 text-sm text-gray-500 hover:text-[#D4A017]">Skip and explore the website →</button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- survey chrome

function SurveyTop({ onBack }: { onBack: () => void }) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <button onClick={onBack} className="rounded p-1 text-gray-400 hover:text-[#D4A017]" aria-label="Back">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <span className="h-1 flex-1 rounded bg-[#D4A017]" aria-hidden />
    </div>
  )
}

// ---------------------------------------------------------------- C. about you (one screen)

function toggle(list: string[], v: string, max: number) {
  if (list.includes(v)) return list.filter((x) => x !== v)
  return list.length >= max ? [...list.slice(1), v] : [...list, v]
}

function ChipGroup({ id, eyebrow, title, hint, options, picked, max, disabled, onChange }: {
  id: string; eyebrow?: string; title: string; hint: string; options: string[]; picked: string[]; max: number; disabled?: boolean; onChange: (v: string[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const [custom, setCustom] = useState('')
  const all = [...options, ...picked.filter((p) => !options.includes(p))]
  const add = () => {
    const v = custom.trim()
    if (v) onChange(toggle(picked, v.slice(0, 60), max))
    setCustom('')
    setAdding(false)
  }
  return (
    <fieldset className={`${ui.card} p-4 md:p-5 transition-opacity ${disabled ? 'opacity-40 pointer-events-none' : ''}`} aria-disabled={disabled}>
      <legend className="sr-only">{title}</legend>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          {eyebrow && <p className={`${ui.eyebrowSm} mb-1`}>{eyebrow}</p>}
          <p className="font-bold text-white" id={`${id}-label`}>{title}</p>
        </div>
        <p className="text-xs text-gray-500">{hint}</p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`${id}-label`}>
        {all.map((o) => {
          const on = picked.includes(o)
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(toggle(picked, o, max))}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${on ? 'border-[#D4A017] text-white' : 'border-gray-700 text-gray-300 hover:border-gray-500'}`}
              style={on ? { backgroundColor: 'rgba(212,160,23,0.12)' } : undefined}
            >
              {o}
            </button>
          )
        })}
        {adding ? (
          <input
            autoFocus
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
              if (e.key === 'Escape') setAdding(false)
            }}
            onBlur={add}
            maxLength={60}
            placeholder="Type and press Enter"
            aria-label={`Add your own: ${title}`}
            className="rounded-full border border-[#D4A017] bg-black px-3.5 py-1.5 text-sm text-white placeholder:text-gray-500 focus:outline-none"
          />
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-700 px-3.5 py-1.5 text-sm text-gray-400 hover:border-[#D4A017] hover:text-[#D4A017]">
            <Plus className="h-3.5 w-3.5" /> Other
          </button>
        )}
      </div>
    </fieldset>
  )
}

function AboutScreen({ draft, setDraft, onBack, onSubmit, error }: {
  draft: Draft; setDraft: (fn: (d: Draft) => Draft) => void; onBack: () => void; onSubmit: () => void; error: { msg: string; retry?: () => void } | null
}) {
  const [more, setMore] = useState(!!draft.extra)
  const [editLoc, setEditLoc] = useState(false)
  const [locText, setLocText] = useState(locationLabel(draft.location))
  const helps = useMemo(() => helpsFor(draft.interests), [draft.interests])
  const ready = draft.interests.length > 0 && draft.helps.length > 0 && draft.skills.length > 0
  const saveLoc = () => {
    const parts = locText.split(',').map((x) => x.trim()).filter(Boolean)
    const location = parts.length >= 3 ? { city: parts[0], state: parts[1], country: parts.slice(2).join(', ') }
      : parts.length === 2 ? { city: parts[0], state: '', country: parts[1] }
      : { city: '', state: '', country: parts[0] ?? '' }
    setDraft((d) => ({ ...d, location }))
    setEditLoc(false)
  }
  // The 5 U's as five tap questions. U1–U3 are needed for good results; U4 and U5 are optional.
  const groups: { id: string; u: string; name: string; title: string; options: string[]; picked: string[]; max: number; optional?: boolean; disabled?: boolean; set: (v: string[]) => void }[] = [
    { id: 'u1', u: 'U1', name: 'LOVE', title: 'What do you love?', options: INTERESTS, picked: draft.interests, max: LIMITS.interests,
      set: (v) => setDraft((d) => ({ ...d, interests: v })) },
    { id: 'u2', u: 'U2', name: 'HELP', title: 'What do people come to you for?', options: helps, picked: draft.helps, max: LIMITS.helps,
      disabled: draft.interests.length === 0, set: (v) => setDraft((d) => ({ ...d, helps: v })) },
    { id: 'u3', u: 'U3', name: 'LEARNED', title: 'What skills have you learned?', options: SKILLS, picked: draft.skills, max: LIMITS.skills,
      disabled: draft.helps.length === 0, set: (v) => setDraft((d) => ({ ...d, skills: v })) },
    { id: 'u4', u: 'U4', name: 'SURVIVED', title: 'What hard thing have you come through?', options: SURVIVED, picked: draft.lived, max: LIMITS.lived, optional: true,
      disabled: draft.skills.length === 0, set: (v) => setDraft((d) => ({ ...d, lived: v })) },
    { id: 'u5', u: 'U5', name: 'WALKED', title: 'What journey do you know from the inside?', options: WALKED, picked: draft.walked, max: LIMITS.walked, optional: true,
      disabled: draft.skills.length === 0, set: (v) => setDraft((d) => ({ ...d, walked: v })) },
  ]
  return (
    <div>
      <SurveyTop onBack={onBack} />
      <h2 className={`${ui.h2} mb-2`}>Your 5 U&apos;s</h2>
      <p className="text-gray-400 mb-6">Tap what fits you. About 40 seconds, no typing needed.</p>
      <div className="grid gap-3">
        {groups.map((g) => (
          <ChipGroup
            key={g.id}
            id={g.id}
            eyebrow={`${g.u} · ${g.name}`}
            title={g.title}
            hint={g.optional ? 'optional' : `pick up to ${g.max}`}
            options={g.options}
            picked={g.picked}
            max={g.max}
            disabled={g.disabled}
            onChange={g.set}
          />
        ))}
        {more ? (
          <div className="grid gap-2">
            <label className="text-xs text-gray-500" htmlFor="fa-extra">Anything else we should know? (optional)</label>
            <input id="fa-extra" className={ui.input} value={draft.extra} maxLength={300} placeholder="e.g. I already sell cakes to neighbours"
              onChange={(e) => setDraft((d) => ({ ...d, extra: e.target.value }))} />
          </div>
        ) : (
          <button onClick={() => setMore(true)} className="w-fit text-sm text-gray-400 hover:text-[#D4A017]">+ Add anything else (optional)</button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <MapPin className="h-4 w-4 text-[#D4A017]" aria-hidden />
          {editLoc ? (
            <span className="flex items-center gap-2">
              <input autoFocus value={locText} onChange={(e) => setLocText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveLoc()}
                placeholder="City, Country" aria-label="Your city and country" className="w-48 rounded border border-gray-700 bg-black px-2 py-1 text-sm text-white focus:border-[#D4A017] focus:outline-none" />
              <button onClick={saveLoc} className="text-[#D4A017]">Save</button>
            </span>
          ) : (
            <>
              <span>{locationLabel(draft.location) || 'Location not set'}</span>
              <button onClick={() => { setLocText(locationLabel(draft.location)); setEditLoc(true) }} className="underline underline-offset-2 hover:text-[#D4A017]">change</button>
            </>
          )}
        </div>
        <button className={ui.btn} disabled={!ready} onClick={onSubmit}>SHOW MY BEST IDEA</button>
      </div>
      {!ready && <p className="mt-3 text-right text-xs text-gray-500">Answer U1, U2 and U3 to continue</p>}
      {error && <div className="mt-4"><ErrorNote error={error.msg} onRetry={error.retry} /></div>}
    </div>
  )
}

// ---------------------------------------------------------------- D. working

function Working() {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const a = setTimeout(() => setStep(1), 2000)
    const b = setTimeout(() => setStep(2), 4500)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [])
  const steps = ['Reading your 5 U\'s', "Matching problems you're placed to solve", 'Writing your pitch']
  return (
    <div className="py-10" role="status" aria-live="polite">
      <h2 className={`${ui.h2} mb-8`}>Finding your best idea…</h2>
      <ol className="grid gap-4">
        {steps.map((t, i) => (
          <li key={t} className={`flex items-center gap-3 text-base ${i < step ? 'text-gray-300' : i === step ? 'text-white font-bold' : 'text-gray-600'}`}>
            {i === step ? <Loader2 className="h-4 w-4 animate-spin text-[#D4A017]" /> : <span className={`h-4 w-4 rounded-full ${i < step ? 'bg-[#D4A017]' : 'border border-gray-700'}`} />}
            {t}
          </li>
        ))}
      </ol>
      <p className="mt-8 text-sm text-gray-500">Usually under 10 seconds. Your answers are kept.</p>
    </div>
  )
}

// ---------------------------------------------------------------- E. results

function Results({ s, user, aiMode, mode, error, setSession, setUser, onMore, onRestart, onExit }: {
  s: FASession; user: PublicUser | null; aiMode: 'live' | 'demo'; mode: 'page' | 'overlay'; error: { msg: string; retry?: () => void } | null
  setSession: (s: FASession) => void; setUser: (u: PublicUser | null) => void; onMore: () => void; onRestart: () => void; onExit?: () => void
}) {
  const [saveOpen, setSaveOpen] = useState(false)
  const [confirmRestart, setConfirmRestart] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const saveRef = useRef<HTMLDivElement>(null)

  async function choose(ideaId: string, pitch?: Pitch) {
    setBusy(true)
    setNote(null)
    try {
      const r = await api<{ session: FASession }>('/api/fa/ai', { json: { task: 'choose', ideaId, pitch } })
      setSession(r.session)
    } catch (e) {
      setNote((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className={ui.eyebrow}>YOUR RESULTS</p>
          <DemoBadge mode={aiMode} />
        </div>
      </div>

      <div className={`${ui.card} p-5 md:p-6`}>
        <p className={`${ui.eyebrowSm} mb-2`}>YOUR EDGE</p>
        <p className="text-lg md:text-xl font-bold text-white leading-snug">{s.unfairAdvantage?.statement}</p>
        {!!s.map?.strengths.length && (
          <div className="mt-3 flex flex-wrap gap-2">
            {s.map.strengths.map((t) => <span key={t} className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-300">{t}</span>)}
          </div>
        )}
      </div>

      <BusinessView s={s} busy={busy} onChoose={choose} />

      {note && <ErrorNote error={note} />}
      {error && <ErrorNote error={error.msg} onRetry={error.retry} />}

      <div className="flex flex-wrap items-center gap-3 border-t border-gray-800 pt-6">
        <button className={ui.btnGhost} onClick={onMore} disabled={busy}>Show 3 different ideas</button>
        <button className={ui.btnGhost} onClick={() => { setSaveOpen(true); setTimeout(() => saveRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }}>Save &amp; email my map</button>
        {confirmRestart ? (
          <span className="flex items-center gap-2 text-sm text-gray-400">
            Start again?
            <button className="text-[#D4A017] underline underline-offset-2" onClick={onRestart}>Yes</button>
            <button className="underline underline-offset-2" onClick={() => setConfirmRestart(false)}>No</button>
          </span>
        ) : (
          <button className="text-sm text-gray-500 hover:text-[#D4A017]" onClick={() => setConfirmRestart(true)}>Start again</button>
        )}
      </div>

      {saveOpen && (
        <div ref={saveRef}>
          <SavePanel s={s} user={user} setUser={setUser} />
        </div>
      )}

      {mode === 'overlay' && onExit && (
        <button onClick={onExit} className="w-fit text-sm text-gray-500 hover:text-[#D4A017]">Continue to the HumanFirst website →</button>
      )}
    </div>
  )
}

type Pitch = { advantage: string; problem: string; solution: string }

function BusinessView({ s, busy, onChoose }: { s: FASession; busy: boolean; onChoose: (id: string, pitch?: Pitch) => Promise<void> }) {
  const ideas = s.topIdeas.map((id) => s.ideas.find((i) => i.id === id)).filter(Boolean) as Idea[]
  const best = ideas[0]
  const others = ideas.slice(1, 3)
  const [editing, setEditing] = useState(false)
  const [details, setDetails] = useState(false)
  const pitch = s.map!.pitch
  const [draft, setDraft] = useState<Pitch>(pitch)
  useEffect(() => setDraft(pitch), [pitch.advantage, pitch.problem, pitch.solution]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!best) return null
  const href = warRoomUrl(s.pitchRef, best.idea)
  return (
    <div className="grid gap-4">
      <article className={`${ui.card} border-[#D4A017] p-5 md:p-7`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className={ui.eyebrowSm}>YOUR BEST IDEA</p>
          <RiskBadge risk={best.risk} />
        </div>
        <h3 className="text-2xl md:text-3xl font-black text-white mb-2">{best.idea}</h3>
        <p className="text-gray-300 mb-5">{best.description}</p>

        <div className="rounded-lg border border-gray-800 bg-black p-4 md:p-5">
          <p className={`${ui.eyebrowSm} mb-3`}>YOUR PITCH</p>
          {editing ? (
            <div className="grid gap-3">
              {([['advantage', 'Because I have…'], ['problem', 'I see a problem most people miss…'], ['solution', 'My solution is…']] as const).map(([k, label]) => (
                <div key={k}>
                  <label htmlFor={`pitch-${k}`} className="text-xs text-gray-500">{label}</label>
                  <textarea id={`pitch-${k}`} rows={2} className={`${ui.input} resize-y`} value={draft[k]} maxLength={400}
                    onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
                </div>
              ))}
              <div className="flex gap-2">
                <button className={ui.btnSm} disabled={busy} onClick={async () => { await onChoose(best.id, draft); setEditing(false) }}>SAVE PITCH</button>
                <button className={ui.btnGhost} onClick={() => { setDraft(pitch); setEditing(false) }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="grid gap-2 text-sm md:text-base text-gray-200 leading-relaxed">
              <p><span className="text-gray-500">Because I have </span>{pitch.advantage}</p>
              <p><span className="text-gray-500">I see a problem most people miss: </span>{pitch.problem}</p>
              <p><span className="text-gray-500">My solution is: </span>{pitch.solution}</p>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-3">
          <a href={href} className={`${ui.btn} w-full md:w-fit`} onClick={() => trackEvent('war_room_clicked', { from: 'results', idea: best.idea })}>
            PITCH THIS IN WAR ROOM →
          </a>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-400">
            {!editing && <button className="hover:text-[#D4A017] underline underline-offset-2" onClick={() => setEditing(true)}>Edit pitch</button>}
            <Link className="hover:text-[#D4A017] underline underline-offset-2" href={`/future-accelerator/validator?idea=${best.id}&auto=1`} onClick={() => trackEvent('validator_opened', { from: 'results' })}>
              Quick check first (optional)
            </Link>
            <button className="inline-flex items-center gap-1 hover:text-[#D4A017]" onClick={() => setDetails(!details)} aria-expanded={details}>
              Details <ChevronDown className={`h-3.5 w-3.5 transition-transform ${details ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {details && (
          <div className="mt-5 grid gap-4 border-t border-gray-800 pt-5 md:grid-cols-2 text-sm">
            <Field label="Why you">{best.whyYou ?? best.solution}</Field>
            <Field label="Who pays">{best.audience}</Field>
            <Field label="Free first step this week">{best.firstStep}</Field>
            <Field label="Keywords">{best.keywords.join(' · ')}</Field>
            <div className="md:col-span-2"><Field label="Human edge (decides the AI risk badge)"><HumanEdgeBars edge={best.humanEdge} /></Field></div>
          </div>
        )}
      </article>

      {others.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {others.map((i) => (
            <article key={i.id} className={`${ui.card} p-5 grid gap-2 content-start`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="font-black text-white">{i.idea}</h4>
                <RiskBadge risk={i.risk} />
              </div>
              <p className="text-sm text-gray-400">{i.whyYou ?? i.description}</p>
              <button className="mt-1 w-fit text-sm font-medium text-[#D4A017] hover:opacity-80 disabled:opacity-50" disabled={busy} onClick={() => onChoose(i.id)}>
                Pitch this instead →
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] tracking-[0.15em] text-gray-500 mb-1">{label.toUpperCase()}</p>
      <div className="text-gray-200 leading-relaxed">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------- optional save

function SavePanel({ s, user, setUser }: { s: FASession; user: PublicUser | null; setUser: (u: PublicUser | null) => void }) {
  const [note, setNote] = useState<string | null>(null)
  if (!user) {
    return (
      <AuthForms
        compact
        saveLabel=""
        heading="Where should we send your map?"
        sub="Create an account (or log in) and we'll email your Career Accelerator Map PDF, your War Room link and a link to book a meeting with KK."
        prefill={s.location}
        onDone={(r) => {
          setUser(r.user)
          setNote(r.emailed ? `Saved. Your map PDF is on its way to ${r.user.email}.` : r.emailNote ? `Saved. ${r.emailNote}` : 'Saved to your account.')
        }}
      />
    )
  }
  return (
    <div className={`${ui.card} p-5 md:p-6 grid gap-3`}>
      <p className={ui.eyebrowSm}>SAVED TO YOUR ACCOUNT</p>
      <p className="text-white">Your ideas, pitch and Career Accelerator Map are saved for {user.email}.</p>
      <p className="text-sm text-gray-400">
        We&apos;ll email the PDF, your War Room link and a link to book a meeting with KK to <span className="text-white">{user.email}</span>.{' '}
        <button className="underline underline-offset-2 hover:text-[#D4A017]" onClick={async () => {
          await api('/api/fa/auth', { json: { action: 'logout', keepResults: true } }).catch(() => {})
          setNote(null)
          setUser(null)
        }}>Not you? Use another email</button>
      </p>
      <div className="flex flex-wrap gap-3">
        <button className={ui.btnSm} onClick={() => downloadMapPdf(s, user.profile).then(() => trackEvent('pdf_downloaded', { kind: 'map' })).catch((e) => setNote((e as Error).message))}>DOWNLOAD MAP (PDF)</button>
        <button className={ui.btnOutlineSm} disabled={note === 'Sending…'} onClick={() => {
          setNote('Sending…')
          api<{ to: string }>('/api/fa/report', { json: { consent: true } }).then((r) => setNote(`PDF sent to ${r.to} ✓`)).catch((e) => setNote((e as Error).message))
        }}>EMAIL ME THE PDF</button>
        <Link href="/future-accelerator/dashboard" className={ui.btnGhost}>My dashboard</Link>
      </div>
      {note && <p className="text-sm text-gray-300" aria-live="polite">{note}</p>}
    </div>
  )
}
