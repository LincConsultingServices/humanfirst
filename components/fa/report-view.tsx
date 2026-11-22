'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { recClass, ui } from '@/lib/fa/ui'
import type { ValidationReport } from '@/lib/fa/types'

export const DISCLAIMER =
  'This score is an AI-assisted preliminary assessment, not proof of market demand or a guarantee of commercial success. Verified facts come from the listed sources; everything else is an estimate or assumption to test with real customers.'

function Section({ title, children, open: initial = false, print }: { title: string; children: React.ReactNode; open?: boolean; print?: boolean }) {
  const [open, setOpen] = useState(initial)
  if (print) {
    return (
      <div className="mb-5 break-inside-avoid">
        <h3 className="text-[11px] tracking-[0.18em] text-[#9a7410] font-bold mb-2">{title.toUpperCase()}</h3>
        <div className="text-sm text-gray-900 space-y-2">{children}</div>
      </div>
    )
  }
  return (
    <div className={ui.card}>
      <button className="flex w-full items-center justify-between gap-3 p-4 md:p-5 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="font-black text-white">{title}</span>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-gray-800 p-4 md:p-5 text-sm text-gray-200 space-y-3 leading-relaxed">{children}</div>}
    </div>
  )
}

const List = ({ items, ordered }: { items: string[]; ordered?: boolean }) =>
  items.length ? (
    ordered ? <ol className="list-decimal pl-5 space-y-1">{items.map((t, i) => <li key={i}>{t}</li>)}</ol> : <ul className="list-disc pl-5 space-y-1">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
  ) : (
    <p className="text-gray-500">None recorded.</p>
  )

export function ScoreSummary({ r, print }: { r: ValidationReport; print?: boolean }) {
  return (
    <div className={print ? 'border border-gray-300 rounded-lg p-5 mb-5' : `${ui.card} p-6 md:p-8 border-[#D4A017]`}>
      <div className="flex flex-wrap items-end gap-6 mb-4">
        <div>
          <div className={print ? 'text-[11px] tracking-[0.18em] text-gray-500' : 'text-xs tracking-[0.18em] text-gray-400'}>BUSINESS IDEA SCORE</div>
          <div className={print ? 'text-5xl font-black' : 'text-6xl font-black text-white'}>{r.total}<span className={print ? 'text-xl text-gray-500' : 'text-2xl text-gray-500'}>/100</span></div>
        </div>
        <span className={`inline-block rounded px-4 py-2 text-lg font-black ${print ? 'border-2 border-black' : recClass(r.recommendation)}`}>{r.recommendation}</span>
      </div>
      <p className={print ? 'text-sm text-gray-900 mb-3' : 'text-gray-200 mb-3'}>{r.recommendationReason}</p>
      <p className={print ? 'text-[10px] text-gray-500' : 'text-xs text-gray-500'}>{DISCLAIMER}</p>
    </div>
  )
}

export function Scorecard({ r, print }: { r: ValidationReport; print?: boolean }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className={print ? 'mb-5 break-inside-avoid' : `${ui.card} p-5 md:p-6`}>
      <div className={print ? 'text-[11px] tracking-[0.18em] text-[#9a7410] font-bold mb-3' : `${ui.eyebrowSm} mb-4`}>100-POINT SCORECARD</div>
      <div className="space-y-3">
        {r.scorecard.map((d) => (
          <div key={d.key}>
            <button className="w-full text-left" onClick={() => !print && setOpen(open === d.key ? null : d.key)} aria-expanded={open === d.key}>
              <div className="flex justify-between text-sm mb-1">
                <span className={print ? 'text-gray-900' : 'text-gray-200'}>{d.label}</span>
                <span className={print ? 'text-gray-900 font-bold' : 'text-white font-bold'}>{d.score}/{d.weight}</span>
              </div>
              <div className={`h-1.5 rounded ${print ? 'bg-gray-200' : 'bg-gray-800'}`}><div className="h-1.5 rounded bg-[#D4A017]" style={{ width: `${(d.score / d.weight) * 100}%` }} /></div>
            </button>
            {(print || open === d.key) && (
              <div className={`mt-2 grid gap-2 md:grid-cols-2 text-xs ${print ? 'text-gray-700' : 'text-gray-300'}`}>
                <p><strong>Why:</strong> {d.reason}</p>
                <p><strong>Evidence:</strong> {d.evidence || '—'}</p>
                <p><strong>Missing:</strong> {d.missing || '—'}</p>
                <p><strong>Improve:</strong> {d.improvement || '—'}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ReportSections({ r, print }: { r: ValidationReport; print?: boolean }) {
  const S = (p: { title: string; children: React.ReactNode; open?: boolean }) => <Section {...p} print={print} />
  return (
    <div className={print ? '' : 'space-y-3'}>
      <S title="Idea summary & problem" open>
        <p>{r.summary}</p>
        <p><strong>Problem:</strong> {r.problem}</p>
        <p><strong>Ideal customer:</strong> {r.idealCustomer}</p>
        <p><strong>Value proposition:</strong> {r.valueProposition}</p>
      </S>
      <S title="Market demand & size">
        <p>{r.demand}</p>
        <p><strong>TAM:</strong> {r.marketSize.tam}<br /><strong>SAM:</strong> {r.marketSize.sam}<br /><strong>SOM:</strong> {r.marketSize.som}</p>
        <p className="text-xs opacity-80"><strong>Assumptions:</strong> {r.marketSize.assumptions}</p>
        <p><strong>Market gaps:</strong></p>
        <List items={r.marketGaps} />
      </S>
      <S title={`Competitor landscape (${r.competitors.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="text-xs opacity-70"><th className="py-1 pr-3">Name</th><th className="py-1 pr-3">Type</th><th className="py-1 pr-3">Notes</th><th className="py-1">Status</th></tr></thead>
            <tbody>
              {r.competitors.map((c, i) => (
                <tr key={i} className="border-t border-gray-800 align-top">
                  <td className="py-2 pr-3 font-bold">{c.name}</td><td className="py-2 pr-3">{c.type}</td><td className="py-2 pr-3">{c.notes}</td>
                  <td className="py-2 text-xs">{c.verified ? 'Found in research' : 'Unverified'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </S>
      <S title="Business model, revenue & costs">
        <p><strong>Recommended model:</strong> {r.businessModel}</p>
        <p><strong>Revenue:</strong> {r.revenue}</p>
        <p><strong>Costs & feasibility:</strong> {r.costs}</p>
      </S>
      <S title={`Why this business could fail (${r.failureRisks.length})`}>
        {r.failureRisks.map((f, i) => (
          <div key={i} className="border-l-2 border-[#D4A017] pl-3">
            <p className="font-bold">{f.risk} <span className="text-xs font-normal opacity-70">· {f.severity} severity</span></p>
            <p><strong>Why:</strong> {f.why}</p>
            <p><strong>Evidence:</strong> {f.evidence}</p>
            <p><strong>Reduce or test it:</strong> {f.mitigation}</p>
          </div>
        ))}
      </S>
      <S title="How this business could succeed">
        <List items={r.successStrategies} />
        <p className="pt-2"><strong>If the idea is weak — pivots to consider:</strong></p>
        <List items={r.pivots} />
      </S>
      <S title="Verified facts vs assumptions">
        <p><strong>Verified facts (from sources)</strong></p>
        <List items={r.verifiedFacts} />
        <p className="pt-2"><strong>Assumptions to test</strong></p>
        <List items={r.assumptions} />
        <p className="pt-2"><strong>Missing information</strong></p>
        <List items={r.missingInfo} />
      </S>
      <S title="MVP & action plans">
        <p><strong>Recommended MVP:</strong> {r.mvp}</p>
        <p className="pt-2"><strong>7-day validation plan</strong></p>
        <List items={r.sevenDayPlan} />
        <p className="pt-2"><strong>30-day action plan</strong></p>
        <List items={r.thirtyDayPlan} />
        <p className="pt-2"><strong>Recommended next steps</strong></p>
        <List items={r.nextSteps} ordered />
      </S>
      <S title="Customer interview questions">
        <List items={r.interviewQuestions} ordered />
      </S>
      <S title={`Sources (${r.sources.length})`}>
        {r.sources.length ? (
          <ul className="space-y-1">
            {r.sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className={print ? 'underline' : ui.link}>{s.title || s.url}</a>{print && <span className="text-[10px] text-gray-500"> — {s.url}</span>}</li>
            ))}
          </ul>
        ) : (
          <p className="opacity-80">No live sources were used for this version, so all market statements are unverified.</p>
        )}
        <p className="text-xs opacity-70">Researched {new Date(r.researchedAt).toLocaleString()}.</p>
      </S>
    </div>
  )
}
