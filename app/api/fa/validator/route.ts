import { NextRequest } from 'next/server'
import { z } from 'zod'
import { currentSession, currentSid, currentUser, newId } from '@/lib/fa/auth'
import { aiMode, fail, handle, json, rateLimited } from '@/lib/fa/http'
import { advisorReply, validationReport } from '@/lib/fa/prompts'
import { emailConfigured, sendMail, validationEmailHtml } from '@/lib/fa/email'
import { validationPdfBytes } from '@/lib/fa/pdf'
import { get, list, put, track } from '@/lib/fa/store'
import type { Validation } from '@/lib/fa/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function canAccess(v: Validation) {
  const sid = await currentSid()
  if (sid && v.sessionId === sid) return true
  const user = await currentUser()
  return !!(user && v.userId === user.id)
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (id) {
      const v = await get('validations', id)
      if (!v || !(await canAccess(v))) return fail('Validation not found', 404)
      const s = await get('sessions', v.sessionId)
      return json({ validation: v, aiMode: aiMode(), founder: s?.unfairAdvantage ? { advantage: s.unfairAdvantage.statement } : null })
    }
    const sid = await currentSid()
    const user = await currentUser()
    const items = await list('validations', (v) => v.sessionId === sid || (!!user && v.userId === user.id))
    return json({ validations: items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), aiMode: aiMode() })
  } catch (e) {
    return handle(e)
  }
}

const Body = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create'),
    ideaId: z.string().max(20).optional(),
    title: z.string().trim().min(3, 'Give your idea a short name').max(140),
    description: z.string().trim().min(10, 'Describe the idea in a sentence or two').max(2000),
    url: z.string().trim().url('Website must be a full URL (https://…)').max(300).optional().or(z.literal('')),
  }),
  z.object({ action: z.literal('message'), id: z.string(), content: z.string().trim().min(1).max(4000) }),
  z.object({ action: z.literal('regenerate'), id: z.string() }),
  z.object({ action: z.literal('restart'), id: z.string() }),
  z.object({ action: z.literal('email'), id: z.string(), version: z.number().int().positive().optional() }),
  z.object({
    action: z.literal('report'),
    id: z.string(),
    title: z.string().trim().min(3).max(140).optional(),
    description: z.string().trim().min(10).max(2000).optional(),
  }),
  z.object({
    action: z.literal('experiment'),
    id: z.string(),
    experimentId: z.string().max(20),
    actualResult: z.string().max(1500),
    meaning: z.string().max(1500).optional(),
    nextAction: z.string().max(1500).optional(),
  }),
])

const opening = (v: Validation) => `I want to validate this business idea: "${v.title}". ${v.description}${v.url ? ` (Website: ${v.url})` : ''}`

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json())
    const session = await currentSession(true)
    if (!session) return fail('Session unavailable', 500)
    if (body.action !== 'experiment' && rateLimited(`v:${session.id}`, 80)) return fail('Too many requests. Please wait a few minutes.', 429)
    const user = await currentUser()

    if (body.action === 'create') {
      const now = new Date().toISOString()
      const v: Validation = {
        id: newId('v_'), sessionId: session.id, userId: user?.id, ideaId: body.ideaId, title: body.title, description: body.description,
        url: body.url || undefined, createdAt: now, updatedAt: now, messages: [], versions: [], aiMode: aiMode(),
      }
      v.messages.push({ role: 'user', content: opening(v) })
      v.messages.push({ role: 'assistant', content: await advisorReply(v, session) })
      await put('validations', v.id, v)
      await track('validator_started', { sessionId: session.id, validationId: v.id })
      return json({ validation: v, aiMode: aiMode() })
    }

    const v = await get('validations', body.id)
    if (!v || !(await canAccess(v))) return fail('Validation not found', 404)

    if (body.action === 'email') {
      if (!user) return fail('Please log in so we know which email address to send the report to.', 401)
      if (!v.versions.length) return fail('Generate the validation report first.')
      if (!emailConfigured()) return fail('Email is not configured on this server yet.', 503)
      if (!v.userId) {
        v.userId = user.id
        await put('validations', v.id, v)
      }
      const pdf = await validationPdfBytes(v, body.version)
      const res = await sendMail(user.email, `Your HumanFirst Validation Report: ${v.title}`, validationEmailHtml(v, user.profile.fullName), [
        { filename: pdf.filename, content: Buffer.from(pdf.bytes), contentType: 'application/pdf' },
      ])
      if (!res.sent) return fail(res.reason ?? 'Email could not be sent.', 503)
      await track('report_emailed', { kind: 'validation', validationId: v.id, userId: user.id })
      return json({ ok: true, to: user.email })
    }
    const owner = (await get('sessions', v.sessionId)) ?? session

    if (body.action === 'message') {
      v.messages.push({ role: 'user', content: body.content })
      v.messages.push({ role: 'assistant', content: await advisorReply(v, owner) })
    } else if (body.action === 'regenerate') {
      if (v.messages.at(-1)?.role === 'assistant') v.messages.pop()
      v.messages.push({ role: 'assistant', content: await advisorReply(v, owner) })
    } else if (body.action === 'restart') {
      v.messages = [{ role: 'user', content: opening(v) }]
      v.messages.push({ role: 'assistant', content: await advisorReply(v, owner) })
    } else if (body.action === 'report') {
      if (body.title) v.title = body.title
      if (body.description) v.description = body.description
      const report = await validationReport(v, owner)
      // carry over recorded experiment results so the tracker isn't lost between versions
      const prev = v.versions.at(-1)?.report.experiments.filter((e) => e.actualResult) ?? []
      report.experiments = [...prev, ...report.experiments]
      v.versions.push({ version: v.versions.length + 1, title: v.title, description: v.description, report, at: new Date().toISOString() })
      v.aiMode = aiMode()
      await track('validation_completed', { sessionId: v.sessionId, validationId: v.id, total: report.total, recommendation: report.recommendation })
    } else if (body.action === 'experiment') {
      const last = v.versions.at(-1)
      const exp = last?.report.experiments.find((e) => e.id === body.experimentId)
      if (!exp) return fail('Experiment not found', 404)
      exp.actualResult = body.actualResult
      exp.meaning = body.meaning
      exp.nextAction = body.nextAction
    }
    v.updatedAt = new Date().toISOString()
    await put('validations', v.id, v)
    return json({ validation: v, aiMode: aiMode() })
  } catch (e) {
    return handle(e)
  }
}
