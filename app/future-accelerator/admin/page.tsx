'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { api } from '@/components/fa/client'
import { ErrorNote, Spinner } from '@/components/fa/parts'
import { ui } from '@/lib/fa/ui'

type Data = {
  totals: { medianSurveySeconds: number | null; leads: number; founder: number; hired: number; unsure: number; warRoom: number; anonymousSessions: number }
  funnel: { label: string; event: string; count: number }[]
  leads: { name: string; email: string; location: string; status: string; institution: string; path: string; topIdea: string; topJob: string; completed: boolean; validation: string; warRoom: boolean; booking: boolean; ceoCity: boolean; createdAt: string }[]
}

export default function AdminPage() {
  const [token, setToken] = useState('')
  const [data, setData] = useState<Data | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(e?: React.FormEvent) {
    e?.preventDefault()
    setBusy(true)
    setError(null)
    try {
      setData(await api<Data>('/api/fa/admin', { headers: { 'x-admin-token': token } }))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const csv = () => {
    if (!data) return
    const cols = Object.keys(data.leads[0] ?? {})
    const rows = [cols.join(','), ...data.leads.map((l) => cols.map((c) => `"${String((l as Record<string, unknown>)[c]).replace(/"/g, '""')}"`).join(','))]
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }))
    a.download = 'humanfirst-leads.csv'
    a.click()
  }

  return (
    <main className="bg-black text-white min-h-screen">
      <Header />
      <section className="px-4 md:px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <p className={`${ui.eyebrow} mb-4`}>HUMANFIRST — ADMIN</p>
          <h1 className="text-4xl md:text-6xl font-black leading-[0.95] mb-10">LEAD DASHBOARD</h1>
          {!data && (
            <form onSubmit={load} className={`${ui.card} p-6 max-w-md space-y-4`}>
              <label className={ui.label} htmlFor="adm">ADMIN TOKEN</label>
              <input id="adm" type="password" className={ui.input} value={token} onChange={(e) => setToken(e.target.value)} />
              <ErrorNote error={error} />
              {busy ? <Spinner label="Loading…" /> : <button className={ui.btn} disabled={!token}>OPEN DASHBOARD</button>}
            </form>
          )}
          {data && (
            <div className="space-y-10">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[['Total leads', data.totals.leads], ['Founder', data.totals.founder], ['Hired', data.totals.hired], ['Not sure', data.totals.unsure], ['War Room clicks', data.totals.warRoom], ['Median survey time', data.totals.medianSurveySeconds != null ? `${data.totals.medianSurveySeconds}s` : '—']].map(([k, v]) => (
                  <div key={k as string} className={`${ui.card} p-5`}><p className="text-4xl font-black">{v}</p><p className="text-xs tracking-[0.15em] text-gray-400 mt-1">{(k as string).toUpperCase()}</p></div>
                ))}
              </div>
              <div className={`${ui.card} p-6`}>
                <p className={`${ui.eyebrowSm} mb-4`}>JOURNEY FUNNEL (UNIQUE SESSIONS)</p>
                <div className="space-y-2">
                  {data.funnel.map((f) => {
                    const max = Math.max(1, data.funnel[0].count)
                    return (
                      <div key={f.event} className="grid grid-cols-[180px_1fr_40px] items-center gap-3 text-sm">
                        <span className="text-gray-300">{f.label}</span>
                        <div className="h-2 rounded bg-gray-800"><div className="h-2 rounded bg-[#D4A017]" style={{ width: `${(f.count / max) * 100}%` }} /></div>
                        <span className="text-right font-bold">{f.count}</span>
                      </div>
                    )
                  })}
                </div>
                <p className="mt-3 text-xs text-gray-500">{data.totals.anonymousSessions} sessions have not registered yet.</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className={ui.eyebrowSm}>LEADS ({data.leads.length})</p>
                  <div className="flex gap-2">
                    <button className={ui.btnGhost} onClick={() => load()}>Refresh</button>
                    <button className={ui.btnSm} onClick={csv} disabled={!data.leads.length}>EXPORT CSV</button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#111] text-xs tracking-wider text-gray-400">
                      <tr>{['Name', 'Email', 'City / State', 'Type', 'Path', '#1 Idea', '#1 Job', 'Status', 'Validation', 'War Room', 'CEO City', 'Booking'].map((h) => <th key={h} className="px-3 py-3 whitespace-nowrap">{h.toUpperCase()}</th>)}</tr>
                    </thead>
                    <tbody>
                      {data.leads.map((l) => (
                        <tr key={l.email} className="border-t border-gray-800 align-top">
                          <td className="px-3 py-3 font-bold whitespace-nowrap">{l.name}</td>
                          <td className="px-3 py-3">{l.email}</td>
                          <td className="px-3 py-3 whitespace-nowrap">{l.location}</td>
                          <td className="px-3 py-3">{l.status}</td>
                          <td className="px-3 py-3 uppercase">{l.path}</td>
                          <td className="px-3 py-3">{l.topIdea}</td>
                          <td className="px-3 py-3">{l.topJob}</td>
                          <td className="px-3 py-3 whitespace-nowrap">{l.completed ? 'Completed' : 'In progress'}</td>
                          <td className="px-3 py-3 whitespace-nowrap">{l.validation}</td>
                          <td className="px-3 py-3">{l.warRoom ? 'Interested' : '—'}</td>
                          <td className="px-3 py-3">{l.ceoCity ? 'Clicked' : '—'}</td>
                          <td className="px-3 py-3">{l.booking ? 'Clicked' : '—'}</td>
                        </tr>
                      ))}
                      {!data.leads.length && <tr><td colSpan={12} className="px-3 py-6 text-gray-400">No registered leads yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
