// Server-only: password hashing, signed cookies, and session/user resolution.
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { get, put, secretFile } from './store'
import type { FASession, User } from './types'

export const SID_COOKIE = 'hf_fa_sid'
export const USER_COOKIE = 'hf_fa_user'

let cachedSecret: string | null = null
async function secret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET
  if (process.env.NODE_ENV === 'production') {
    console.warn('[fa] AUTH_SECRET is not set; using a generated secret. Set AUTH_SECRET in production.')
  }
  cachedSecret ??= await secretFile()
  return cachedSecret
}

export const newId = (prefix = '') => prefix + crypto.randomBytes(12).toString('base64url')

async function sign(value: string) {
  const mac = crypto.createHmac('sha256', await secret()).update(value).digest('base64url')
  return `${value}.${mac}`
}

async function unsign(signed?: string | null) {
  if (!signed) return null
  const i = signed.lastIndexOf('.')
  if (i < 1) return null
  const value = signed.slice(0, i)
  const expected = await sign(value)
  const a = Buffer.from(expected)
  const b = Buffer.from(signed)
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? value : null
}

const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 180,
}

export async function setSidCookie(sid: string) {
  ;(await cookies()).set(SID_COOKIE, await sign(sid), cookieOpts)
}
export async function setUserCookie(uid: string) {
  ;(await cookies()).set(USER_COOKIE, await sign(uid), cookieOpts)
}
export async function clearUserCookie(keepSession = false) {
  const c = await cookies()
  c.delete(USER_COOKIE)
  if (!keepSession) c.delete(SID_COOKIE)
}

/** "Not you?": sign out but keep this device's current results so another person can save them under their own email. */
export async function releaseSessionFromUser(user: User) {
  const sid = await currentSid()
  if (!sid) return
  const s = await get('sessions', sid)
  if (!s || s.userId !== user.id) return
  s.userId = undefined
  await put('sessions', s.id, s)
  user.sessionIds = user.sessionIds.filter((id) => id !== s.id)
  await put('users', user.id, user)
}

export async function currentUser(): Promise<User | null> {
  const uid = await unsign((await cookies()).get(USER_COOKIE)?.value)
  return uid ? await get('users', uid) : null
}

export async function currentSid(): Promise<string | null> {
  return unsign((await cookies()).get(SID_COOKIE)?.value)
}

export function emptySession(id: string): FASession {
  const now = new Date().toISOString()
  return {
    id, createdAt: now, updatedAt: now, stage: 'welcome', messages: [], answers: {},
    uaQuestions: [], uaAnswers: [], gaps: [], selectedGaps: [], ideas: [], jobs: [],
    refinements: [], topIdeas: [], topJobs: [],
  }
}

/** The session bound to this browser; created (and cookie set) when missing. */
export async function currentSession(create = true): Promise<FASession | null> {
  const sid = await currentSid()
  if (sid) {
    const s = await get('sessions', sid)
    if (s) return s
  }
  if (!create) return null
  const s = emptySession(newId('s_'))
  const user = await currentUser()
  if (user) s.userId = user.id
  await put('sessions', s.id, s)
  await setSidCookie(s.id)
  return s
}

export async function canAccessSession(s: FASession) {
  const sid = await currentSid()
  if (sid === s.id) return true
  const user = await currentUser()
  return !!(user && s.userId === user.id)
}

// ---- passwords ----
export function hashPassword(pw: string) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(pw, salt, 64)
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}
export function verifyPassword(pw: string, stored: string) {
  const [, s, h] = stored.split('$')
  if (!s || !h) return false
  const hash = crypto.scryptSync(pw, Buffer.from(s, 'base64'), 64)
  const expected = Buffer.from(h, 'base64')
  return expected.length === hash.length && crypto.timingSafeEqual(expected, hash)
}

/** Attach this browser's anonymous session (and its validations) to the user. */
export async function attachSessionToUser(user: User) {
  const sid = await currentSid()
  if (!sid) return
  const s = await get('sessions', sid)
  if (!s) return
  if (s.userId && s.userId !== user.id) return
  s.userId = user.id
  await put('sessions', s.id, s)
  if (!user.sessionIds.includes(s.id)) {
    user.sessionIds.push(s.id)
    await put('users', user.id, user)
  }
  const { list } = await import('./store')
  for (const v of await list('validations', (v) => v.sessionId === sid && !v.userId)) {
    v.userId = user.id
    await put('validations', v.id, v)
  }
}

export function publicUser(u: User) {
  return { id: u.id, email: u.email, profile: u.profile }
}
