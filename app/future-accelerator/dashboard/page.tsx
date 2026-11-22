'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { api } from '@/components/fa/client'
import { AuthForms, type PublicUser } from '@/components/fa/auth-forms'
import { ErrorNote, Spinner } from '@/components/fa/parts'
import { downloadMapPdf, downloadValidationPdf } from '@/lib/fa/pdf'
import { recClass, ui } from '@/lib/fa/ui'
import type { FASession, Validation } from '@/lib/fa/types'

type Data = {
  user: PublicUser | null
  sessions?: { id: string; updatedAt: string; stage: string; path?: string; hasMap: boolean; advantage?: string; topIdea?: string; topJob?: string }[]
  validations?: { id: string; title: string; updatedAt: string; versions: number; last: { total: number; recommendation: string } | null }[]
}

const date = (d: string) => new Date(d).toLocaleDateString()

export default function DashboardPage() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [emailMsg, setEmailMsg] = useState<Record<string, string>>({})
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mode') === 'register') setAuthMode('register')
  }, [])

  const load = useCallback(() => {
    api<Data>('/api/fa/report').then(setData).catch((e) => setError(e.message))
  }, [])
  useEffect(load, [load])

  async function logout() {
    await api('/api/fa/auth', { json: { action: 'logout' } }).catch(() => {})
    setData({ user: null })
  }
  const note = (id: string, msg: string) => setEmailMsg((m) => ({ ...m, [id]: msg }))
  async function email(id: string) {
    note(id, 'Sending…')
    try {
      const r = await api<{ to: string }>('/api/fa/report', { json: { sessionId: id, consent: true } })
      note(id, `PDF sent to ${r.to} ✓`)
    } catch (e) {
      note(id, (e as Error).message)
    }
  }
  async function downloadMap(id: string) {
    note(id, 'Preparing PDF…')
    try {
      const r = await api<{ session: FASession; user: PublicUser }>(`/api/fa/report?sessionId=${encodeURIComponent(id)}`)
      await downloadMapPdf(r.session, r.user.profile)
      note(id, '')
    } catch (e) {
      note(id, (e as Error).message)
    }
  }
  async function emailValidation(id: string) {
    note(id, 'Sending…')
    try {
      const r = await api<{ to: string }>('/api/fa/validator', { json: { action: 'email', id } })
      note(id, `PDF sent to ${r.to} ✓`)
    } catch (e) {
      note(id, (e as Error).message)
    }
  }
  async function downloadValidation(id: string) {
    note(id, 'Preparing PDF…')
    try {
      const r = await api<{ validation: Validation }>(`/api/fa/validator?id=${encodeURIComponent(id)}`)
      await downloadValidationPdf(r.validation)
      note(id, '')
    } catch (e) {
      note(id, (e as Error).message)
    }
  }

  return (
    <main className="bg-black text-white min-h-screen">
      <Header />
      <section className="px-4 md:px-6 py-16 md:py-20">
        <div className="max-w-6xl mx-auto">
          <p className={`${ui.eyebrow} mb-4`}>HUMANFIRST FUTURE ACCELERATOR</p>
          <h1 className={`${ui.h1} mb-10`}>MY DASHBOARD</h1>
          {error && <ErrorNote error={error} onRetry={load} />}
          {!data && !error && <Spinner label="Loading…" />}
          {data && !data.user && (
            <div className="max-w-3xl">
              <AuthForms key={authMode} compact initialMode={authMode} saveLabel="" heading="Log in or create your account" sub="Your saved ideas, pitches, Career Accelerator Maps and validations live here." onDone={() => load()} />
            </div>
          )}
          {data?.user && (
            <div className="space-y-12">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-gray-300">Signed in as <span className="text-white font-bold">{data.user.profile.fullName}</span> ({data.user.email})</p>
                <div className="flex gap-3">
                  <Link href="/future-accelerator" className={ui.btnSm}>CONTINUE MY JOURNEY</Link>
                  <button onClick={logout} className={ui.btnGhost}>Log out</button>
                </div>
              </div>

              <div>
                <h2 className={`${ui.h3} mb-4`}>CAREER ACCELERATOR MAPS</h2>
                {data.sessions?.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {data.sessions.map((s) => (
                      <div key={s.id} className={`${ui.card} p-6`}>
                        <p className="text-xs text-gray-500 mb-2">Updated {date(s.updatedAt)} · {s.path ? s.path.toUpperCase() : '—'} · {s.hasMap ? 'Map ready' : 'In progress'}</p>
                        {s.advantage && <p className="text-white font-bold mb-3">{s.advantage}</p>}
                        <p className="text-sm text-gray-400">#1 idea: <span className="text-gray-200">{s.topIdea ?? '—'}</span></p>
                        {s.topJob && <p className="text-sm text-gray-400">#1 job: <span className="text-gray-200">{s.topJob}</span></p>}
                        <div className="mb-5" />
                        <div className="flex flex-wrap gap-2">
                          {s.hasMap ? (
                            <>
                              <button onClick={() => downloadMap(s.id)} className={ui.btnSm}>DOWNLOAD PDF</button>
                              <button onClick={() => email(s.id)} disabled={emailMsg[s.id] === 'Sending…'} className={ui.btnOutlineSm}>EMAIL ME THE PDF</button>
                              <Link href={`/future-accelerator/map?id=${s.id}`} className={ui.btnGhost}>View</Link>
                            </>
                          ) : (
                            <a href={`/api/fa/session?open=${s.id}`} onClick={async (e) => { e.preventDefault(); await api(`/api/fa/session?open=${s.id}`); location.href = '/future-accelerator' }} className={ui.btnSm}>RESUME</a>
                          )}
                        </div>
                        {emailMsg[s.id] && <p className="mt-2 text-xs text-gray-300" aria-live="polite">{emailMsg[s.id]}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No maps yet. <Link href="/future-accelerator" className={ui.link}>Start your Future Accelerator →</Link></p>
                )}
              </div>

              <div>
                <h2 className={`${ui.h3} mb-4`}>BUSINESS IDEA VALIDATIONS</h2>
                {data.validations?.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {data.validations.map((v) => (
                      <div key={v.id} className={`${ui.card} p-6`}>
                        <p className="text-xs text-gray-500 mb-2">Updated {date(v.updatedAt)} · {v.versions} version{v.versions === 1 ? '' : 's'}</p>
                        <p className="text-white font-bold mb-3">{v.title}</p>
                        {v.last ? (
                          <span className={`inline-block rounded px-2 py-1 text-xs font-bold ${recClass(v.last.recommendation)}`}>{v.last.total}/100 · {v.last.recommendation}</span>
                        ) : (
                          <span className="text-xs text-gray-400">Conversation in progress</span>
                        )}
                        <div className="mt-5 flex flex-wrap gap-2">
                          {v.last && <button onClick={() => downloadValidation(v.id)} className={ui.btnSm}>DOWNLOAD PDF</button>}
                          {v.last && <button onClick={() => emailValidation(v.id)} disabled={emailMsg[v.id] === 'Sending…'} className={ui.btnOutlineSm}>EMAIL ME THE PDF</button>}
                          <Link href={`/future-accelerator/validator?id=${v.id}`} className={ui.btnGhost}>Open</Link>
                        </div>
                        {emailMsg[v.id] && <p className="mt-2 text-xs text-gray-300" aria-live="polite">{emailMsg[v.id]}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No validations yet. <Link href="/future-accelerator/validator" className={ui.link}>Validate a business idea →</Link></p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </main>
  )
}
