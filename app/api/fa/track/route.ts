import { NextRequest } from 'next/server'
import { currentSid, currentUser } from '@/lib/fa/auth'
import { fail, json } from '@/lib/fa/http'
import { track } from '@/lib/fa/store'

export const dynamic = 'force-dynamic'

// Client-side events only; server-side milestones are tracked where they happen.
const ALLOWED = new Set(['agent_started', 'survey_completed', 'pdf_downloaded', 'war_room_clicked', 'ceo_city_clicked', 'booking_clicked', 'validator_opened'])

export async function POST(req: NextRequest) {
  const { event, props } = await req.json().catch(() => ({}))
  if (!ALLOWED.has(event)) return fail('Unknown event')
  const safe = Object.fromEntries(
    Object.entries(typeof props === 'object' && props ? props : {})
      .filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v))
      .map(([k, v]) => [k.slice(0, 40), typeof v === 'string' ? v.slice(0, 200) : v]),
  )
  const user = await currentUser()
  await track(event, { ...safe, sessionId: (await currentSid()) ?? undefined, userId: user?.id })
  return json({ ok: true })
}
