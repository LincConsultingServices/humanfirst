import { NextRequest } from 'next/server'
import { z } from 'zod'
import { currentSession, currentUser, emptySession, newId, publicUser, setSidCookie } from '@/lib/fa/auth'
import { aiMode, fail, handle, json } from '@/lib/fa/http'
import { get, put, track } from '@/lib/fa/store'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser()
    const fresh = req.nextUrl.searchParams.get('new') === '1'
    const open = req.nextUrl.searchParams.get('open')
    if (req.nextUrl.searchParams.get('peek') === '1') {
      // Read-only: never creates a session (used by the homepage launcher).
      return json({ session: await currentSession(false), user: user ? publicUser(user) : null, aiMode: aiMode() })
    }
    let session
    if (open && user) {
      // Resume one of the user's saved sessions on this device.
      const s = await get('sessions', open)
      if (!s || s.userId !== user.id) return fail('Session not found', 404)
      await setSidCookie(s.id)
      session = s
    } else if (fresh) {
      session = emptySession(newId('s_'))
      if (user) {
        session.userId = user.id
        user.sessionIds.push(session.id)
        await put('users', user.id, user)
      }
      await put('sessions', session.id, session)
      await setSidCookie(session.id)
    } else {
      session = await currentSession(true)
    }
    return json({ session, user: user ? publicUser(user) : null, aiMode: aiMode() })
  } catch (e) {
    return handle(e)
  }
}

const msg = z.object({
  id: z.string().max(40),
  role: z.enum(['ai', 'user']),
  text: z.string().max(8000),
  card: z.string().max(40).optional(),
  ref: z.string().max(80).optional(),
})

// Only fields the browser is allowed to change. AI-generated content is written by /api/fa/ai.
const Patch = z
  .object({
    stage: z.enum(['welcome', 'playbook', 'station1', 'fiveUIntro', 'fiveU', 'fiveUSummary', 'ua', 'uaConfirm', 'location', 'gaps', 'opportunities', 'top5', 'map', 'register', 'saved', 'validate', 'final', 'about', 'results']),
    path: z.enum(['founder', 'hired', 'unsure']),
    messages: z.array(msg).max(400),
    answers: z.record(z.string().regex(/^u[1-5]\.[0-2]$/), z.string().max(2000).nullable()),
    uaAnswers: z.array(z.string().max(2000).nullable()).max(5),
    unfairAdvantage: z.object({ statement: z.string().max(600), explanation: z.string().max(2000), confirmed: z.boolean() }),
    location: z.object({ city: z.string().min(1).max(80), state: z.string().max(80), country: z.string().max(80) }),
    selectedGaps: z.array(z.string().max(20)).max(3),
    topIdeas: z.array(z.string().max(20)).max(5),
    topJobs: z.array(z.string().max(20)).max(5),
  })
  .partial()

const once = new Set(['path_selected', 'five_us_completed', 'gaps_selected', 'top5_selected'])

export async function PUT(req: NextRequest) {
  try {
    const s = await currentSession(false)
    if (!s) return fail('No active session', 404)
    const body = await req.json()
    const patch = Patch.parse(body.patch ?? {})
    const before = { ...s }
    Object.assign(s, patch, { updatedAt: new Date().toISOString() })
    await put('sessions', s.id, s)

    const ev: string[] = []
    if (patch.path && !before.path) ev.push('path_selected')
    if (patch.stage === 'fiveUSummary' && before.stage === 'fiveU') ev.push('five_us_completed')
    if (patch.selectedGaps?.length === 3 && before.selectedGaps.length !== 3) ev.push('gaps_selected')
    if (patch.stage === 'map' && before.stage === 'top5') ev.push('top5_selected')
    for (const e of ev) if (once.has(e)) await track(e, { sessionId: s.id, path: s.path })
    return json({ ok: true, updatedAt: s.updatedAt })
  } catch (e) {
    return handle(e)
  }
}
