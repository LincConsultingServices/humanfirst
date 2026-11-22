import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { fail, json } from '@/lib/fa/http'
import { list, readEvents } from '@/lib/fa/store'

export const dynamic = 'force-dynamic'

function authorised(req: NextRequest) {
  const token = process.env.ADMIN_TOKEN
  const given = req.headers.get('x-admin-token') ?? ''
  if (!token || !given) return false
  const a = Buffer.from(crypto.createHash('sha256').update(token).digest('hex'))
  const b = Buffer.from(crypto.createHash('sha256').update(given).digest('hex'))
  return crypto.timingSafeEqual(a, b)
}

export async function GET(req: NextRequest) {
  if (!process.env.ADMIN_TOKEN) return fail('Set ADMIN_TOKEN on the server to enable the lead dashboard.', 503)
  if (!authorised(req)) return fail('Not authorised', 401)

  const [users, sessions, validations, events] = await Promise.all([
    list('users'), list('sessions'), list('validations'), readEvents(),
  ])
  const warRoomBySession = new Set(events.filter((e) => e.event === 'war_room_clicked').map((e) => e.sessionId))
  const ceoCityBySession = new Set(events.filter((e) => e.event === 'ceo_city_clicked').map((e) => e.sessionId))
  const bookingBySession = new Set(events.filter((e) => e.event === 'booking_clicked').map((e) => e.sessionId))

  const leads = users.map((u) => {
    const own = sessions.filter((s) => s.userId === u.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    const s = own[0]
    const v = validations.filter((x) => x.userId === u.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
    const last = v?.versions.at(-1)?.report
    return {
      name: u.profile.fullName,
      email: u.email,
      location: `${u.profile.city}, ${u.profile.state}`,
      status: u.profile.status,
      institution: u.profile.institution,
      path: s?.path ?? '—',
      topIdea: s?.ideas.find((i) => i.id === s.topIdeas[0])?.idea ?? '—',
      topJob: s?.jobs.find((j) => j.id === s.topJobs[0])?.title ?? '—',
      completed: !!s?.map,
      validation: last ? `${last.total}/100 ${last.recommendation}` : '—',
      warRoom: own.some((x) => warRoomBySession.has(x.id)),
      booking: own.some((x) => bookingBySession.has(x.id)),
      ceoCity: own.some((x) => ceoCityBySession.has(x.id)),
      createdAt: u.createdAt,
    }
  })

  const count = (name: string) => new Set(events.filter((e) => e.event === name).map((e) => e.sessionId ?? e.userId)).size
  const funnel = [
    ['Agent started', 'agent_started'], ['Path selected', 'path_selected'], ['Survey completed', 'survey_completed'],
    ['Opportunities shown', 'opportunities_generated'], ['War Room clicked', 'war_room_clicked'], ['CEO City clicked', 'ceo_city_clicked'],
    ['Registered', 'registration_completed'], ['PDF downloaded', 'pdf_downloaded'], ['Validation completed', 'validation_completed'],
    ['Booking clicked', 'booking_clicked'],
].map(([label, ev]) => ({ label, event: ev, count: count(ev) }))

  const secs = events.filter((e) => e.event === 'survey_completed' && typeof e.seconds === 'number').map((e) => e.seconds as number).sort((x, y) => x - y)
  const medianSurveySeconds = secs.length ? secs[Math.floor(secs.length / 2)] : null

  return json({
    totals: {
      medianSurveySeconds,
      leads: users.length,
      founder: leads.filter((l) => l.path === 'founder').length,
      hired: leads.filter((l) => l.path === 'hired').length,
      unsure: leads.filter((l) => l.path === 'unsure').length,
      warRoom: leads.filter((l) => l.warRoom).length,
      anonymousSessions: sessions.filter((s) => !s.userId).length,
    },
    funnel,
    leads: leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  })
}
