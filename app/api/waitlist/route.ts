import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { z } from 'zod'

const WAITLIST_RECIPIENT = 'kk@humanfirstbykk.com'
const WAITLIST_SOURCE = 'HumanFirst by KK — Experience / CEO City'

const waitlistSchema = z.object({
  email: z.string().trim().max(254).email('Please enter a valid email address.'),
  // Honeypot: hidden from people, so anything typed here came from a bot.
  website: z.string().max(0).optional(),
})

// Best-effort spam brake: at most RATE_LIMIT submissions per IP per window.
// In-memory, so it resets on deploy and is per server instance.
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 10 * 60 * 1000
const recentSubmissions = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = (recentSubmissions.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS)
  if (timestamps.length >= RATE_LIMIT) {
    recentSubmissions.set(ip, timestamps)
    return true
  }
  timestamps.push(now)
  recentSubmissions.set(ip, timestamps)
  return false
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request.' }, { status: 400 })
  }

  const parsed = waitlistSchema.safeParse(body)
  if (!parsed.success) {
    const honeypotTripped = parsed.error.issues.some((issue) => issue.path[0] === 'website')
    // Don't tell bots they were caught.
    if (honeypotTripped) {
      return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.' }, { status: 400 })
    }
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message || 'Please enter a valid email address.' },
      { status: 400 }
    )
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, message: 'Too many attempts. Please wait a few minutes and try again.' },
      { status: 429 }
    )
  }

  const { EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM } = process.env
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASSWORD) {
    console.error('[waitlist] Email is not configured. Set EMAIL_HOST, EMAIL_USER and EMAIL_PASSWORD.')
    return NextResponse.json(
      { success: false, message: 'The waitlist is temporarily unavailable. Please try again later.' },
      { status: 503 }
    )
  }

  const visitorEmail = parsed.data.email
  const registeredAt = new Date()
  const registeredAtText = `${registeredAt.toUTCString()} (${registeredAt.toISOString()})`

  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: parseInt(EMAIL_PORT || '587'),
    secure: EMAIL_SECURE === 'true',
    auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD },
  })

  try {
    const info = await transporter.sendMail({
      // Send from our own authenticated address; the visitor goes in Reply-To.
      from: EMAIL_FROM || EMAIL_USER,
      replyTo: visitorEmail,
      to: WAITLIST_RECIPIENT,
      subject: 'New CEO City Waitlist Registration',
      text: [
        'New CEO City Waitlist Registration',
        '',
        `Email: ${visitorEmail}`,
        `Registered: ${registeredAtText}`,
        `Source: ${WAITLIST_SOURCE}`,
      ].join('\n'),
      html: `
        <h2>New CEO City Waitlist Registration</h2>
        <p><strong>Email:</strong> ${escapeHtml(visitorEmail)}</p>
        <p><strong>Registered:</strong> ${escapeHtml(registeredAtText)}</p>
        <p><strong>Source:</strong> ${escapeHtml(WAITLIST_SOURCE)}</p>
      `,
    })

    if (!info.accepted.map(String).includes(WAITLIST_RECIPIENT)) {
      console.error('[waitlist] Mail server did not accept the recipient:', info.rejected)
      return NextResponse.json(
        { success: false, message: 'We couldn’t add you to the waitlist. Please try again.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true, message: 'You’re on the waitlist! We’ll keep you updated.' })
  } catch (error) {
    console.error('[waitlist] Failed to send notification email:', error)
    return NextResponse.json(
      { success: false, message: 'We couldn’t add you to the waitlist. Please try again.' },
      { status: 502 }
    )
  }
}
