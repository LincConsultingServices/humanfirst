'use client'

import { useState } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { humanEdgeFactors, riskLegend } from '@/lib/fa/quick'
import { riskClass, ui } from '@/lib/fa/ui'
import type { CareerMap, FASession, HumanEdge, Idea, Job, Profile, Risk } from '@/lib/fa/types'

export function RiskBadge({ risk }: { risk: Risk }) {
  return (
    <span title={riskLegend[risk]} className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-bold tracking-wider ${riskClass(risk)}`}>
      {risk.toUpperCase()} RISK
    </span>
  )
}

export function DemoBadge({ mode }: { mode?: 'live' | 'demo' }) {
  if (mode !== 'demo') return null
  return (
    <span className="inline-block rounded border border-gray-600 px-2 py-0.5 text-[11px] tracking-wider text-gray-300" title="No AI key is configured on the server, so results are demo content built from your answers.">
      DEMO MODE
    </span>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-gray-300" role="status" aria-live="polite">
      <Loader2 className="h-4 w-4 animate-spin text-[#D4A017]" />
      <span>{label ?? 'Thinking…'}</span>
    </div>
  )
}

export function ErrorNote({ error, onRetry }: { error: string | null; onRetry?: () => void }) {
  if (!error) return null
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded border border-[#FF6B35] px-4 py-3 text-sm text-[#FF6B35]">
      <span>{error}</span>
      {onRetry && (
        <button onClick={onRetry} className="underline underline-offset-2 hover:opacity-80">
          Try again
        </button>
      )}
    </div>
  )
}

export function HumanEdgeBars({ edge }: { edge: HumanEdge }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
      {humanEdgeFactors.map((f) => (
        <div key={f.key}>
          <div className="text-[11px] text-gray-400 mb-1">{f.label}</div>
          <div className="flex gap-1">
            {[0, 1].map((i) => (
              <span key={i} className={`h-1.5 flex-1 rounded ${edge[f.key] > i ? 'bg-[#D4A017]' : 'bg-gray-800'}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] tracking-[0.15em] text-gray-500 mb-1">{label.toUpperCase()}</div>
      <div className="text-sm text-gray-200 leading-relaxed">{children}</div>
    </div>
  )
}

export function IdeaCard({ idea, index, selected, onToggle, selectLabel, rank }: { idea: Idea; index: number; selected?: boolean; onToggle?: () => void; selectLabel?: string; rank?: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`${ui.card} ${selected ? 'border-[#D4A017]' : ''}`}>
      <div className="flex items-start gap-3 p-4">
        {onToggle && (
          <button onClick={onToggle} aria-pressed={selected} aria-label={selectLabel ?? 'Select'} className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border text-xs font-bold ${selected ? 'border-[#D4A017] bg-[#D4A017] text-black' : 'border-gray-600 text-transparent hover:border-[#D4A017]'}`}>
            {rank ?? '✓'}
          </button>
        )}
        <button className="flex-1 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs text-gray-500">#{index + 1}</span>
            <span className="font-black text-white">{idea.idea}</span>
            <RiskBadge risk={idea.risk} />
            {idea.origin && idea.origin !== 'generated' && <span className="text-[11px] tracking-wider text-[#D4A017]">{idea.origin === 'combine' ? 'COMBINED' : '$0 VERSION'}</span>}
          </div>
          <p className="text-sm text-gray-400">{idea.description}</p>
        </button>
        <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="grid gap-4 border-t border-gray-800 p-4 md:grid-cols-2">
          <Field label="Problem">{idea.problem}</Field>
          <Field label="Solution only I can build">{idea.solution}</Field>
          <Field label="Target audience">{idea.audience}</Field>
          <Field label="Business keywords">{idea.keywords.join(' · ')}</Field>
          <Field label="First step with $0 this week">{idea.firstStep}</Field>
          <Field label="Human Edge Test"><HumanEdgeBars edge={idea.humanEdge} /></Field>
        </div>
      )}
    </div>
  )
}

export function JobCard({ job, index, selected, onToggle, rank }: { job: Job; index: number; selected?: boolean; onToggle?: () => void; rank?: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`${ui.card} ${selected ? 'border-[#D4A017]' : ''}`}>
      <div className="flex items-start gap-3 p-4">
        {onToggle && (
          <button onClick={onToggle} aria-pressed={selected} aria-label="Select job" className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border text-xs font-bold ${selected ? 'border-[#D4A017] bg-[#D4A017] text-black' : 'border-gray-600 text-transparent hover:border-[#D4A017]'}`}>
            {rank ?? '✓'}
          </button>
        )}
        <button className="flex-1 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs text-gray-500">#{index + 1}</span>
            <span className="font-black text-white">{job.title}</span>
            <RiskBadge risk={job.risk} />
            {job.emerging && <span className="text-[11px] tracking-wider text-[#D4A017]">EMERGING</span>}
          </div>
          <p className="text-sm text-gray-400">{job.description}</p>
        </button>
        <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="grid gap-4 border-t border-gray-800 p-4 md:grid-cols-2">
          <Field label="Solution only I can bring">{job.solution}</Field>
          <Field label="Target companies (suggested — not verified vacancies)">{job.targetCompanies.join(' · ')}</Field>
          <Field label="Resume keywords">{job.keywords.join(' · ')}</Field>
          <Field label="First portfolio step this week">{job.portfolioStep}</Field>
          <div className="md:col-span-2"><Field label="Human Edge Test"><HumanEdgeBars edge={job.humanEdge} /></Field></div>
        </div>
      )}
    </div>
  )
}

/** Career Accelerator Map — on-screen and print layout (page 15 structure of the playbook). */
export function MapView({ s, profile, print = false }: { s: FASession; profile?: Partial<Profile> | null; print?: boolean }) {
  const idea = s.ideas.find((i) => i.id === s.topIdeas[0])
  const job = s.jobs.find((j) => j.id === s.topJobs[0])
  const gap = s.gaps.find((g) => g.id === s.selectedGaps[0])
  const m: CareerMap | undefined = s.map
  const box = print ? 'border border-gray-300 rounded-lg p-5 break-inside-avoid' : `${ui.card} p-5 md:p-6`
  const label = print ? 'text-[11px] tracking-[0.18em] text-[#9a7410] mb-2 font-bold' : `${ui.eyebrowSm} mb-2`
  const text = print ? 'text-sm text-gray-900' : 'text-sm text-gray-200'
  const kv = (k: string, v?: string | string[]) =>
    v && (Array.isArray(v) ? v.length : true) ? (
      <div className="mb-2">
        <div className={print ? 'text-[10px] tracking-wider text-gray-500' : 'text-[11px] tracking-wider text-gray-500'}>{k.toUpperCase()}</div>
        <div className={text}>{Array.isArray(v) ? v.join(' · ') : v}</div>
      </div>
    ) : null
  return (
    <div className={print ? 'text-gray-900' : ''}>
      <div className={print ? 'mb-6 border-b-4 border-[#D4A017] pb-4' : 'mb-6'}>
        <p className={print ? 'text-xs tracking-[0.2em] text-[#9a7410] font-bold' : ui.eyebrow}>HUMANFIRST FUTURE ACCELERATOR</p>
        <h2 className={print ? 'text-4xl font-black' : 'text-3xl md:text-5xl font-black leading-[0.95] mt-2'}>MY CAREER ACCELERATOR MAP</h2>
        {m && <p className={print ? 'text-xs text-gray-500 mt-1' : 'text-xs text-gray-500 mt-2'}>Generated {new Date(m.generatedAt).toLocaleDateString()}</p>}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={box}>
          <div className={label}>MY PROFILE</div>
          {kv('Name', profile?.fullName || 'Create your account to add your name')}
          {kv('Institution / Company', profile?.institution)}
          {kv('Location', s.location ? `${s.location.city}, ${s.location.state}${s.location.country ? `, ${s.location.country}` : ''}` : undefined)}
          {kv('Status', profile?.status)}
          {m && kv('Strengths', m.strengths)}
        </div>
        <div className={box}>
          <div className={label}>MY UNFAIR ADVANTAGE</div>
          <p className={`${text} text-base font-medium`}>{s.unfairAdvantage?.statement}</p>
          <div className={`${label} mt-5`}>THE PAIN ONLY I CAN SEE</div>
          <p className={text}>{gap?.problem}</p>
        </div>
        {idea && (
          <div className={box}>
            <div className={label}>🚀 FOUNDER PATH — #1 BUSINESS IDEA</div>
            <p className={`${text} text-lg font-black mb-3`}>{idea.idea}</p>
            {kv('Solution only I can build', idea.solution)}
            {kv('Target audience', idea.audience)}
            {kv('AI disruption risk', idea.risk)}
            {kv('Business keywords', idea.keywords)}
            {kv('First step with $0 this week', idea.firstStep)}
          </div>
        )}
        {job && (
          <div className={box}>
            <div className={label}>💼 HIRED PATH — #1 JOB TITLE</div>
            <p className={`${text} text-lg font-black mb-3`}>{job.title}{job.emerging ? ' (Emerging)' : ''}</p>
            {kv('Solution only I can bring', job.solution)}
            {kv('Target companies (suggested, not vacancies)', job.targetCompanies)}
            {kv('AI disruption risk', job.risk)}
            {kv('Resume keywords', job.keywords)}
            {kv('First step to build my portfolio this week', job.portfolioStep)}
          </div>
        )}
        {m && (
          <div className={box}>
            <div className={label}>MY NEXT 3 ACTIONS</div>
            {kv('1. This week', m.nextActions.thisWeek)}
            {kv('2. In 14 days', m.nextActions.in14Days)}
            {kv('3. In 30 days', m.nextActions.in30Days)}
          </div>
        )}
        {m && (
          <div className={box}>
            <div className={label}>MY PITCH</div>
            <p className={`${text} mb-2`}>“Because I have <strong>{m.pitch.advantage}</strong>…”</p>
            <p className={`${text} mb-2`}>“I see a problem most people miss: <strong>{m.pitch.problem}</strong>.”</p>
            <p className={text}>“My solution is <strong>{m.pitch.solution}</strong>.”</p>
          </div>
        )}
      </div>
      {(s.topIdeas.length > 1 || s.topJobs.length > 1) && (
        <div className="grid gap-4 md:grid-cols-2 mt-4">
          {s.topIdeas.length > 0 && (
            <div className={box}>
              <div className={label}>MY TOP {s.topIdeas.length} BUSINESS IDEAS</div>
              <ol className={`${text} list-decimal pl-5 space-y-1`}>
                {s.topIdeas.map((id) => {
                  const i = s.ideas.find((x) => x.id === id)
                  return i ? <li key={id}>{i.idea} <span className="text-gray-500">({i.risk} risk)</span></li> : null
                })}
              </ol>
            </div>
          )}
          {s.topJobs.length > 0 && (
            <div className={box}>
              <div className={label}>MY TOP {s.topJobs.length} JOB TITLES</div>
              <ol className={`${text} list-decimal pl-5 space-y-1`}>
                {s.topJobs.map((id) => {
                  const j = s.jobs.find((x) => x.id === id)
                  return j ? <li key={id}>{j.title} <span className="text-gray-500">({j.risk} risk)</span></li> : null
                })}
              </ol>
            </div>
          )}
        </div>
      )}
      <p className={print ? 'mt-6 text-[10px] text-gray-500' : 'mt-6 text-xs text-gray-500'}>
        AI-assisted results{s.aiMode === 'demo' ? ' (demo mode)' : ''}. Target companies are suggestions, not verified vacancies. Market problems and willingness to pay are hypotheses to test. No job or business is completely AI-proof.
      </p>
    </div>
  )
}

export function TypingDots({ label }: { label?: string }) {
  return (
    <div className="flex gap-3" role="status" aria-live="polite">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#D4A017] text-[11px] font-black text-black" aria-hidden>HF</div>
      <div className="rounded-lg border border-gray-800 bg-[#111] px-4 py-3">
        <span className="flex items-center gap-1.5" aria-hidden>
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#D4A017] [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#D4A017] [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#D4A017]" />
        </span>
        {label && <span className="mt-2 block text-xs text-gray-400">{label}…</span>}
        <span className="sr-only">{label ?? 'HumanFirst AI is typing'}</span>
      </div>
    </div>
  )
}
