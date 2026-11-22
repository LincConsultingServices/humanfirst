'use client'

import { useState } from 'react'
import { ui } from '@/lib/fa/ui'
import { api } from './client'
import { ErrorNote } from './parts'

export type PublicUser = { id: string; email: string; profile: { fullName: string; email: string; status: string; institution: string; institutionType: string; city: string; state: string; country: string; website?: string; consentEmail: boolean } }
export type AuthResult = { user: PublicUser; emailed?: boolean; emailNote?: string }

const STATUSES = ['School Student', 'College Student', 'Working Professional', 'Entrepreneur', 'Other']
const INST_TYPES = ['School', 'College / University', 'Company', 'Other']

export function AuthForms({
  onDone,
  initialMode = 'register',
  prefill,
  heading,
  sub,
  saveLabel = ' & SAVE MY MAP',
  compact = false,
}: {
  onDone: (r: AuthResult) => void
  initialMode?: 'register' | 'login'
  prefill?: { city?: string; state?: string; country?: string }
  heading?: string
  sub?: string
  saveLabel?: string
  /** Only name, email and password (everything else is already known or optional) */
  compact?: boolean
}) {
  const [mode, setMode] = useState<'register' | 'login'>(initialMode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [f, setF] = useState({
    fullName: '', email: '', password: '', status: '', institution: '', institutionType: '', website: '',
    city: prefill?.city ?? '', state: prefill?.state ?? '', country: prefill?.country ?? '', consentEmail: true, privacy: false,
  })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const r =
        mode === 'login'
          ? await api<AuthResult>('/api/fa/auth', { json: { action: 'login', email: f.email, password: f.password } })
          : await api<AuthResult>('/api/fa/auth', {
              json: {
                action: 'register',
                password: f.password,
                privacy: f.privacy,
                profile: {
                  fullName: f.fullName, email: f.email, status: f.status, institution: f.institution, institutionType: f.institutionType,
                  website: f.website, city: f.city, state: f.state, country: f.country, consentEmail: f.consentEmail,
                },
              },
            })
      onDone(r)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className={`${ui.card} p-5 md:p-8`} noValidate>
      {heading && <h3 className="text-2xl md:text-3xl font-black mb-2">{heading}</h3>}
      {sub && <p className="text-gray-300 mb-6">{sub}</p>}
      <div className="flex gap-2 mb-6" role="tablist">
        {(['register', 'login'] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(null) }}
            className={mode === m ? ui.btnSm : ui.btnGhost}>
            {m === 'register' ? 'CREATE ACCOUNT' : 'LOG IN'}
          </button>
        ))}
      </div>

      {mode === 'register' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className={ui.label} htmlFor="fa-name">FULL NAME *</label><input id="fa-name" className={ui.input} value={f.fullName} onChange={set('fullName')} autoComplete="name" placeholder="Enter your full name" /></div>
          <div><label className={ui.label} htmlFor="fa-email">EMAIL ADDRESS *</label><input id="fa-email" type="email" className={ui.input} value={f.email} onChange={set('email')} autoComplete="email" placeholder="Enter your email" /></div>
          <div><label className={ui.label} htmlFor="fa-pw">PASSWORD *</label><input id="fa-pw" type="password" className={ui.input} value={f.password} onChange={set('password')} autoComplete="new-password" placeholder="At least 8 characters" /></div>
          {!compact && <>
          <div>
            <label className={ui.label} htmlFor="fa-status">CURRENT STATUS *</label>
            <select id="fa-status" className={ui.input} value={f.status} onChange={set('status')}>
              <option value="">Select…</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div><label className={ui.label} htmlFor="fa-inst">SCHOOL / COLLEGE / ORGANIZATION *</label><input id="fa-inst" className={ui.input} value={f.institution} onChange={set('institution')} placeholder="Institution or company name" /></div>
          <div>
            <label className={ui.label} htmlFor="fa-insttype">INSTITUTION TYPE *</label>
            <select id="fa-insttype" className={ui.input} value={f.institutionType} onChange={set('institutionType')}>
              <option value="">Select…</option>
              {INST_TYPES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="md:col-span-2"><label className={ui.label} htmlFor="fa-web">INSTITUTION / COMPANY WEBSITE (OPTIONAL)</label><input id="fa-web" className={ui.input} value={f.website} onChange={set('website')} placeholder="https://" /></div>
          <div><label className={ui.label} htmlFor="fa-city">CITY *</label><input id="fa-city" className={ui.input} value={f.city} onChange={set('city')} autoComplete="address-level2" /></div>
          <div><label className={ui.label} htmlFor="fa-state">STATE *</label><input id="fa-state" className={ui.input} value={f.state} onChange={set('state')} autoComplete="address-level1" /></div>
          <div><label className={ui.label} htmlFor="fa-country">COUNTRY *</label><input id="fa-country" className={ui.input} value={f.country} onChange={set('country')} autoComplete="country-name" /></div>
          </>}
          <div className="md:col-span-2 space-y-3 text-sm text-gray-300">
            <label className="flex items-start gap-3">
              <input type="checkbox" className="mt-1 accent-[#D4A017]" checked={f.consentEmail} onChange={set('consentEmail')} />
              <span>Email me a copy of my Career Accelerator Map.</span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" className="mt-1 accent-[#D4A017]" checked={f.privacy} onChange={set('privacy')} />
              <span>I agree that HumanFirst stores my profile, my answers and my generated reports so I can access them later and so HumanFirst can follow up about its programs. I can ask for my data to be deleted at any time by emailing kk.humanfirst@gmail.com. *</span>
            </label>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className={ui.label} htmlFor="fa-lemail">EMAIL ADDRESS</label><input id="fa-lemail" type="email" className={ui.input} value={f.email} onChange={set('email')} autoComplete="email" /></div>
          <div><label className={ui.label} htmlFor="fa-lpw">PASSWORD</label><input id="fa-lpw" type="password" className={ui.input} value={f.password} onChange={set('password')} autoComplete="current-password" /></div>
        </div>
      )}

      <div className="mt-6 space-y-4">
        <ErrorNote error={error} />
        <button type="submit" disabled={busy} className={ui.btn}>
          {busy ? 'PLEASE WAIT…' : mode === 'register' ? `CREATE ACCOUNT${saveLabel}` : `LOG IN${saveLabel}`}
        </button>
      </div>
    </form>
  )
}
