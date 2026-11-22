import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { AIError, aiEnabled } from './ai'

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status })
export const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status })

export function handle(e: unknown) {
  if (e instanceof AIError) return fail(e.message, e.status)
  if (e instanceof ZodError) return fail(e.issues[0]?.message ?? 'Invalid input', 400)
  console.error('[fa] route error', e)
  return fail('Something went wrong. Please try again.', 500)
}

export const aiMode = () => (aiEnabled() ? 'live' : 'demo') as 'live' | 'demo'

// Very small in-memory limiter for AI calls (per key, per hour). Enough to stop
// accidental loops; use a shared store if running multiple instances.
const hits = new Map<string, number[]>()
export function rateLimited(key: string, max = 60) {
  const now = Date.now()
  const arr = (hits.get(key) ?? []).filter((t) => now - t < 3_600_000)
  arr.push(now)
  hits.set(key, arr)
  return arr.length > max
}
