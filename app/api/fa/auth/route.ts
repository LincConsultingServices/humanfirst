import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  attachSessionToUser, clearUserCookie, releaseSessionFromUser, currentSession, currentUser, hashPassword, newId,
  publicUser, setUserCookie, verifyPassword,
} from '@/lib/fa/auth'
import { emailConfigured, mapEmailHtml, sendMail } from '@/lib/fa/email'
import { mapPdfBytes } from '@/lib/fa/pdf'
import { fail, handle, json, rateLimited } from '@/lib/fa/http'
import { findUserByEmail, get, put, track } from '@/lib/fa/store'
import type { User } from '@/lib/fa/types'

export const dynamic = 'force-dynamic'

const optText = (max: number) => z.string().trim().max(max).default('')
const Profile = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name').max(100),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  status: z.union([z.enum(['School Student', 'College Student', 'Working Professional', 'Entrepreneur', 'Other']), z.literal('')]).default(''),
  institution: optText(120),
  institutionType: z.union([z.enum(['School', 'College / University', 'Company', 'Other']), z.literal('')]).default(''),
  website: z.string().trim().max(200).url('Website must be a full URL (https://…)').optional().or(z.literal('')),
  city: optText(80),
  state: optText(80),
  country: optText(80),
  consentEmail: z.boolean(),
})

const Register = z.object({
  action: z.literal('register'),
  profile: Profile,
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
  privacy: z.boolean().refine((v) => v, 'Please accept the privacy notice to create an account'),
})
const Login = z.object({ action: z.literal('login'), email: z.string().trim().toLowerCase().email('Please enter a valid email address'), password: z.string().min(1, 'Please enter your password') })
const Logout = z.object({ action: z.literal('logout'), keepResults: z.boolean().optional() })
const Body = z.discriminatedUnion('action', [Register, Login, Logout])

async function maybeEmailMap(user: User) {
  const s = await currentSession(false)
  if (!s?.map || !user.profile.consentEmail || s.emailedAt) return { emailed: false }
  if (!emailConfigured()) return { emailed: false, emailNote: 'Email is not set up on this server yet, so download your map PDF instead.' }
  try {
    const pdf = await mapPdfBytes(s, user.profile)
    const r = await sendMail(user.email, 'Your HumanFirst Career Accelerator Map', mapEmailHtml(s, user.profile), [
      { filename: pdf.filename, content: Buffer.from(pdf.bytes), contentType: 'application/pdf' },
    ])
    if (r.sent) {
      s.emailedAt = new Date().toISOString()
      await put('sessions', s.id, s)
      return { emailed: true }
    }
    return { emailed: false, emailNote: r.reason }
  } catch (e) {
    console.error('[fa] email failed', e)
    return { emailed: false, emailNote: 'We could not send the email right now. You can resend it from your dashboard.' }
  }
}

export async function GET() {
  const user = await currentUser()
  return json({ user: user ? publicUser(user) : null })
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local'
    if (rateLimited(`auth:${ip}`, 30)) return fail('Too many attempts. Please wait and try again.', 429)
    const body = Body.parse(await req.json())

    if (body.action === 'logout') {
      if (body.keepResults) {
        const u = await currentUser()
        if (u) await releaseSessionFromUser(u)
      }
      await clearUserCookie(!!body.keepResults)
      return json({ ok: true })
    }

    if (body.action === 'login') {
      const user = await findUserByEmail(body.email)
      if (!user || !verifyPassword(body.password, user.passwordHash)) return fail('Email or password is incorrect.', 401)
      await setUserCookie(user.id)
      await attachSessionToUser(user)
      const email = await maybeEmailMap(user)
      return json({ user: publicUser(user), ...email })
    }

    const existing = await findUserByEmail(body.profile.email)
    if (existing) return fail('An account with this email already exists. Please log in instead.', 409)
    const user: User = {
      id: newId('u_'),
      email: body.profile.email,
      passwordHash: hashPassword(body.password),
      profile: { ...body.profile, website: body.profile.website || undefined },
      createdAt: new Date().toISOString(),
      sessionIds: [],
    }
    await put('users', user.id, user)
    await setUserCookie(user.id)
    await attachSessionToUser(user)
    const fresh = await get('users', user.id)
    await track('registration_completed', { userId: user.id, sessionId: fresh?.sessionIds[0] })
    const email = await maybeEmailMap(fresh ?? user)
    return json({ user: publicUser(fresh ?? user), ...email })
  } catch (e) {
    return handle(e)
  }
}
