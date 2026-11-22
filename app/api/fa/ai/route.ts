import { NextRequest } from 'next/server'
import { z } from 'zod'
import { currentSession, newId } from '@/lib/fa/auth'
import { aiMode, fail, handle, json, rateLimited } from '@/lib/fa/http'
import { quickOpportunities } from '@/lib/fa/prompts'
import { pitchFor } from '@/lib/fa/quick'
import { put, track } from '@/lib/fa/store'
import type { FASession, PitchDoc } from '@/lib/fa/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const chips = (max: number) => z.array(z.string().trim().min(1).max(60)).max(max)
const Location = z.object({ city: z.string().max(80), state: z.string().max(80), country: z.string().max(80) })

const Body = z.discriminatedUnion('task', [
  z.object({
    task: z.literal('quick'),
    path: z.enum(['founder', 'hired', 'unsure']),
    interests: chips(3).min(1, 'Pick at least one interest'),
    skills: chips(4).min(1, 'Pick at least one skill'),
    helps: chips(3).min(1, 'Pick what people come to you for'),
    lived: chips(3).optional(),
    walked: chips(3).optional(),
    extra: z.string().trim().max(300).optional(),
    location: Location,
    more: z.boolean().optional(),
  }),
  z.object({
    task: z.literal('choose'),
    ideaId: z.string().max(20),
    pitch: z.object({ advantage: z.string().trim().min(3).max(300), problem: z.string().trim().min(3).max(400), solution: z.string().trim().min(3).max(400) }).optional(),
  }),
])

/** Keep the War Room pitch for this conversation in step with the chosen idea. */
async function savePitch(s: FASession) {
  const idea = s.ideas.find((i) => i.id === s.topIdeas[0])
  if (!idea || !s.map) return
  s.pitchRef ??= newId('p_')
  const doc: PitchDoc = {
    id: s.pitchRef,
    sessionId: s.id,
    idea: { title: idea.idea, description: idea.description, audience: idea.audience },
    pitch: s.map.pitch,
    updatedAt: new Date().toISOString(),
  }
  await put('pitches', doc.id, doc)
}

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json())

    if (body.task === 'quick') {
      const s = await currentSession(true)
      if (!s) return fail('Could not start your session. Please reload the page.', 500)
      if (rateLimited(s.id, 30)) return fail('Too many requests. Please wait a few minutes.', 429)
      const quick = { path: body.path, interests: body.interests, skills: body.skills, helps: body.helps, lived: body.lived ?? [], walked: body.walked ?? [], extra: body.extra || undefined, location: body.location }
      const exclude = body.more ? s.ideas.map((i) => i.idea) : []
      const r = await quickOpportunities(quick, exclude)
      if (!r.ideas.length) return fail('No ideas came back. Please try again.', 502)

      const firstTime = !s.quick
      s.quick = quick
      s.path = body.path
      s.location = body.location
      s.aiMode = aiMode()
      s.ideas = r.ideas
      s.jobs = r.jobs
      s.topIdeas = r.ideas.map((i) => i.id)
      s.topJobs = r.jobs.map((j) => j.id)
      // Each idea's problem doubles as the "pain only I can see" on the Career Accelerator Map.
      s.gaps = r.ideas.map((i) => ({ id: i.id, problem: i.problem, who: i.audience, why: '', uLinks: [], advantage: i.whyYou ?? '', willingnessToPay: '' }))
      s.selectedGaps = [r.ideas[0].id]
      s.unfairAdvantage = { statement: r.edge, explanation: '', confirmed: true }
      s.map = { generatedAt: new Date().toISOString(), strengths: r.strengths, nextActions: r.nextActions, pitch: pitchFor(r.ideas[0], r.pitchAdvantage) }
      s.stage = 'results'
      s.updatedAt = new Date().toISOString()
      await savePitch(s)
      await put('sessions', s.id, s)
      if (firstTime) await track('path_selected', { sessionId: s.id, path: body.path })
      await track('opportunities_generated', { sessionId: s.id, path: body.path, more: !!body.more })
      return json({ session: s, aiMode: s.aiMode })
    }

    // choose: make another idea the #1 (and/or save an edited pitch). No AI needed.
    const s = await currentSession(false)
    if (!s || !s.map) return fail('Your results were not found. Please start again.', 404)
    const idea = s.ideas.find((i) => i.id === body.ideaId)
    if (!idea) return fail('That idea was not found.', 404)
    s.topIdeas = [idea.id, ...s.topIdeas.filter((id) => id !== idea.id)]
    s.selectedGaps = [idea.id]
    s.map.pitch = body.pitch ?? pitchFor(idea, s.map.pitch.advantage)
    s.map.nextActions = { ...s.map.nextActions, thisWeek: idea.firstStep }
    s.updatedAt = new Date().toISOString()
    await savePitch(s)
    await put('sessions', s.id, s)
    return json({ session: s, aiMode: s.aiMode ?? aiMode() })
  } catch (e) {
    return handle(e)
  }
}
