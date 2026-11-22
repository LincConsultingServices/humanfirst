import { NextRequest } from 'next/server'
import { currentSession, currentUser, publicUser } from '@/lib/fa/auth'
import { emailConfigured, mapEmailHtml, sendMail } from '@/lib/fa/email'
import { mapPdfBytes } from '@/lib/fa/pdf'
import { fail, handle, json } from '@/lib/fa/http'
import { get, list, put } from '@/lib/fa/store'

export const dynamic = 'force-dynamic'

/** Everything the signed-in user owns, for the dashboard. */
export async function GET(req: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) return json({ user: null })
    // One full saved conversation (for downloading its PDF from the dashboard).
    const sid = req.nextUrl.searchParams.get('sessionId')
    if (sid) {
      const s = await get('sessions', sid)
      if (!s || s.userId !== user.id) return fail('Report not found.', 404)
      return json({ session: s, user: publicUser(user) })
    }
    const sessions = (await list('sessions', (s) => s.userId === user.id)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    const validations = (await list('validations', (v) => v.userId === user.id)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return json({
      user: publicUser(user),
      sessions: sessions.map((s) => ({
        id: s.id, updatedAt: s.updatedAt, stage: s.stage, path: s.path, hasMap: !!s.map,
        advantage: s.unfairAdvantage?.statement,
        topIdea: s.ideas.find((i) => i.id === s.topIdeas[0])?.idea,
        topJob: s.jobs.find((j) => j.id === s.topJobs[0])?.title,
      })),
      validations: validations.map((v) => ({ id: v.id, title: v.title, updatedAt: v.updatedAt, versions: v.versions.length, last: v.versions.at(-1) ? { total: v.versions.at(-1)!.report.total, recommendation: v.versions.at(-1)!.report.recommendation } : null })),
    })
  } catch (e) {
    return handle(e)
  }
}

/** Email the current Career Accelerator Map to the signed-in user (requires consent). */
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) return fail('Please log in first.', 401)
    const { sessionId, consent } = await req.json().catch(() => ({}))
    const s = sessionId ? await get('sessions', String(sessionId)) : await currentSession(false)
    if (!s || s.userId !== user.id) return fail('Report not found.', 404)
    if (!s.map) return fail('Generate your Career Accelerator Map first.')
    if (consent === true && !user.profile.consentEmail) {
      user.profile.consentEmail = true
      await put('users', user.id, user)
    }
    if (!user.profile.consentEmail) return fail('Please confirm you want the report emailed to you.')
    if (!emailConfigured()) return fail('Email is not configured on this server yet.', 503)
    const pdf = await mapPdfBytes(s, user.profile)
    const r = await sendMail(user.email, 'Your HumanFirst Career Accelerator Map', mapEmailHtml(s, user.profile), [
      { filename: pdf.filename, content: Buffer.from(pdf.bytes), contentType: 'application/pdf' },
    ])
    if (!r.sent) return fail(r.reason ?? 'Email could not be sent.', 503)
    s.emailedAt = new Date().toISOString()
    await put('sessions', s.id, s)
    return json({ ok: true, emailedAt: s.emailedAt, to: user.email })
  } catch (e) {
    return handle(e)
  }
}
