// Server-only module (uses the filesystem). Never import from client components.
import { promises as fs } from 'fs'
import path from 'path'
import type { FASession, PitchDoc, User, Validation } from './types'

// Minimal document store: one JSON file per document, grouped by collection.
// Swap this file for Firestore (or another DB) before production on Cloud Run —
// the container filesystem there is ephemeral. Keep the same function signatures.

const ROOT = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.FA_DATA_DIR || '.data')

type Collections = {
  sessions: FASession
  users: User
  validations: Validation
  pitches: PitchDoc
}
type Name = keyof Collections

const safeId = (id: string) => /^[a-zA-Z0-9_-]{6,80}$/.test(id)

async function dir(name: string) {
  const d = path.join(/*turbopackIgnore: true*/ ROOT, name)
  await fs.mkdir(d, { recursive: true })
  return d
}

export async function get<N extends Name>(name: N, id: string): Promise<Collections[N] | null> {
  if (!safeId(id)) return null
  try {
    const raw = await fs.readFile(path.join(/*turbopackIgnore: true*/ await dir(name), `${id}.json`), 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function put<N extends Name>(name: N, id: string, doc: Collections[N]) {
  if (!safeId(id)) throw new Error('bad id')
  const file = path.join(/*turbopackIgnore: true*/ await dir(name), `${id}.json`)
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
  await fs.writeFile(tmp, JSON.stringify(doc, null, 2))
  await fs.rename(tmp, file)
}

export async function list<N extends Name>(name: N, filter?: (d: Collections[N]) => boolean): Promise<Collections[N][]> {
  const d = await dir(name)
  const files = (await fs.readdir(d)).filter((f) => f.endsWith('.json'))
  const docs: Collections[N][] = []
  for (const f of files) {
    try {
      const doc = JSON.parse(await fs.readFile(path.join(/*turbopackIgnore: true*/ d, f), 'utf8'))
      if (!filter || filter(doc)) docs.push(doc)
    } catch {
      /* skip unreadable */
    }
  }
  return docs
}

// Email → user id index lives in the users collection itself (small scale MVP).
export async function findUserByEmail(email: string) {
  const users = await list('users', (u) => u.email === email.toLowerCase())
  return users[0] ?? null
}

// ---- analytics events (append-only JSON lines) ----
export async function track(event: string, props: Record<string, unknown> = {}) {
  try {
    const d = await dir('events')
    const line = JSON.stringify({ event, at: new Date().toISOString(), ...props }) + '\n'
    await fs.appendFile(path.join(/*turbopackIgnore: true*/ d, 'events.jsonl'), line)
  } catch (e) {
    console.error('[fa] track failed', e)
  }
}

export async function readEvents(): Promise<{ event: string; at: string; sessionId?: string; [k: string]: unknown }[]> {
  try {
    const raw = await fs.readFile(path.join(/*turbopackIgnore: true*/ await dir('events'), 'events.jsonl'), 'utf8')
    return raw.split('\n').filter(Boolean).map((l) => JSON.parse(l))
  } catch {
    return []
  }
}

export async function secretFile(): Promise<string> {
  // Dev convenience only: a random secret persisted next to the data.
  const file = path.join(/*turbopackIgnore: true*/ await dir('secrets'), 'auth-secret')
  try {
    return await fs.readFile(file, 'utf8')
  } catch {
    const s = (await import('crypto')).randomBytes(32).toString('hex')
    await fs.writeFile(file, s)
    return s
  }
}
