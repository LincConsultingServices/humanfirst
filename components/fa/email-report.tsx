'use client'

import { useState } from 'react'
import { ui } from '@/lib/fa/ui'
import { api } from './client'
import { AuthForms } from './auth-forms'

// "Email me the report" for a validation. If the visitor isn't logged in, the login /
// create-account form opens right here; once they're in, the PDF is sent to that email
// automatically, without a second click.
export function EmailReportButton({ validationId, version, label = 'EMAIL ME THE REPORT', className = ui.btnOutlineSm }: {
  validationId: string
  version?: number | null
  label?: string
  className?: string
}) {
  const [note, setNote] = useState<string | null>(null)
  const [needLogin, setNeedLogin] = useState(false)

  async function send() {
    setNote('Sending…')
    try {
      const r = await api<{ to: string }>('/api/fa/validator', { json: { action: 'email', id: validationId, version: version ?? undefined } })
      setNote(`PDF sent to ${r.to} ✓`)
    } catch (e) {
      if ((e as Error & { status?: number }).status === 401) {
        setNote(null)
        setNeedLogin(true)
      } else {
        setNote((e as Error).message)
      }
    }
  }

  return (
    <>
      <button className={className} disabled={note === 'Sending…'} onClick={send}>{label}</button>
      {note && <p className="basis-full text-sm text-gray-300" aria-live="polite">{note}</p>}
      {needLogin && (
        <div className="basis-full">
          <AuthForms
            compact
            initialMode="login"
            saveLabel=" & EMAIL MY REPORT"
            heading="Where should we send your report?"
            sub="Log in or create an account. We'll email the PDF to that address straight away, and the report is saved to your account."
            onDone={() => {
              setNeedLogin(false)
              send()
            }}
          />
        </div>
      )}
    </>
  )
}
