// Server-only email delivery. Reuses the site's existing nodemailer + EMAIL_* configuration.
import nodemailer from 'nodemailer'
import { BOOKING_URL, warRoomUrl } from './quick'
import type { FASession, Profile, Validation } from './types'

// Two ways to send (see docs/EMAIL_SETUP.md):
//  A. Gmail API via Google Cloud OAuth: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, EMAIL_USER
//  B. SMTP / Gmail App Password: EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD
const gmailOAuth = () =>
  !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN && process.env.EMAIL_USER)
const smtp = () => !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD)
export const emailConfigured = () => gmailOAuth() || smtp()

function transport() {
  if (gmailOAuth()) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      },
    })
  }
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
  })
}
export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://humanfirstbykk.com').replace(/\/$/, '')

const esc = (t: unknown) =>
  String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const btn = (href: string, label: string, solid = true) =>
  `<a href="${href}" style="display:inline-block;${solid ? 'background:#D4A017;color:#000;' : 'background:#000;color:#D4A017;border:2px solid #D4A017;'}padding:12px 20px;border-radius:4px;text-decoration:none;font-size:14px;font-weight:bold">${esc(label)}</a>`

// Shared bottom of every HumanFirst email: the War Room and a meeting with KK.
function nextStepsHtml(warRoomHref: string, ideaTitle?: string) {
  return `
<div style="margin-top:28px;padding:20px;background:#000;border-radius:8px">
  <div style="color:#D4A017;font-size:12px;letter-spacing:2px;font-weight:bold">NEXT STEP · THE WAR ROOM</div>
  <div style="color:#fff;font-size:20px;font-weight:900;margin:8px 0 10px">Pitch ${ideaTitle ? `"${esc(ideaTitle)}"` : 'your idea'} in the War Room</div>
  <p style="color:#d1d5db;font-size:14px;line-height:1.6;margin:0 0 6px">The War Room is KK's live business simulation. You pitch your idea, face Shark Tank-style questions, test your decisions and leave with a 30-day plan toward your first customer.</p>
  <p style="color:#d1d5db;font-size:14px;line-height:1.6;margin:0 0 16px">Your pitch is ready and comes with you.</p>
  ${btn(warRoomHref, 'PITCH MY IDEA IN WAR ROOM')}
</div>
<div style="margin-top:16px;padding:20px;border:1px solid #e5e5e5;border-radius:8px">
  <div style="color:#9a7410;font-size:12px;letter-spacing:2px;font-weight:bold">TALK IT THROUGH WITH KK</div>
  <p style="color:#111;font-size:14px;line-height:1.6;margin:8px 0 16px">Want a second opinion on your idea or a plan for your next 30 days? Book a free 30-minute call with KK.</p>
  ${btn(BOOKING_URL, 'BOOK A MEETING WITH KK', false)}
  <p style="color:#888;font-size:12px;margin:12px 0 0">Or open: ${esc(BOOKING_URL)}</p>
</div>`
}

export function mapEmailHtml(s: FASession, p: Profile) {
  const idea = s.ideas.find((i) => i.id === s.topIdeas[0])
  const m = s.map
  const first = (p.fullName || '').trim().split(/\s+/)[0] || 'there'
  const warRoomHref = warRoomUrl(s.pitchRef, idea?.idea ?? '', 'email')
  return `<!doctype html><html><body style="margin:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:640px;margin:0 auto;background:#fff">
<div style="background:#000;padding:24px 28px"><div style="color:#D4A017;font-size:12px;letter-spacing:3px">HUMANFIRST FUTURE ACCELERATOR</div><div style="color:#fff;font-size:26px;font-weight:900;margin-top:6px">Your Career Accelerator Map</div></div>
<div style="padding:24px 28px 28px;color:#111;font-size:14px;line-height:1.6">
<p style="font-size:16px;margin:0 0 12px">Hi ${esc(first)},</p>
<p style="margin:0 0 12px">Thank you for discovering your opportunities with HumanFirst. Your <b>Career Accelerator Map</b> is attached to this email as a PDF.</p>
${s.unfairAdvantage ? `<p style="margin:0 0 4px;color:#9a7410;font-size:12px;letter-spacing:2px;font-weight:bold">YOUR EDGE</p><p style="margin:0 0 16px">${esc(s.unfairAdvantage.statement)}</p>` : ''}
${idea ? `<p style="margin:0 0 4px;color:#9a7410;font-size:12px;letter-spacing:2px;font-weight:bold">YOUR BEST IDEA</p><p style="margin:0 0 6px;font-size:18px;font-weight:900">${esc(idea.idea)}</p><p style="margin:0 0 16px;color:#444">${esc(idea.description)}</p>` : ''}
${m ? `<div style="border-left:3px solid #D4A017;padding:4px 0 4px 14px;margin:0 0 8px">
<p style="margin:0 0 6px"><span style="color:#888">Because I have</span> ${esc(m.pitch.advantage)}</p>
<p style="margin:0 0 6px"><span style="color:#888">I see a problem most people miss:</span> ${esc(m.pitch.problem)}</p>
<p style="margin:0"><span style="color:#888">My solution is:</span> ${esc(m.pitch.solution)}</p></div>` : ''}
${m ? `<p style="margin:16px 0 0"><b>This week:</b> ${esc(m.nextActions.thisWeek)}</p>` : ''}
${nextStepsHtml(warRoomHref, idea?.idea)}
<p style="margin-top:24px"><a href="${siteUrl()}/future-accelerator" style="color:#9a7410">See your results online</a> · <a href="${siteUrl()}/future-accelerator/dashboard" style="color:#9a7410">My account</a></p>
<p style="font-size:11px;color:#999;margin-top:24px">You received this because you asked HumanFirst to email your Career Accelerator Map. AI-generated ideas are a starting point to test with real customers, not professional advice.</p>
</div></div></body></html>`
}

export type Attachment = { filename: string; content: Buffer; contentType?: string }

export function validationEmailHtml(v: Validation, name: string) {
  const last = v.versions.at(-1)
  const r = last?.report
  if (!last || !r) return ''
  return `<!doctype html><html><body style="margin:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:640px;margin:0 auto;background:#fff">
<div style="background:#000;padding:24px 28px"><div style="color:#D4A017;font-size:12px;letter-spacing:3px">HUMANFIRST AI BUSINESS IDEA VALIDATOR</div><div style="color:#fff;font-size:24px;font-weight:900;margin-top:6px">${esc(last.title)}</div></div>
<div style="padding:20px 28px 28px;color:#111;font-size:14px">
<p>Hi ${esc(name.split(' ')[0] || 'there')},</p>
<p>Your Business Idea Validation Report is attached as a PDF.</p>
<p style="font-size:30px;font-weight:900;margin:16px 0 4px">${r.total}/100 <span style="font-size:16px;color:#9a7410">${esc(r.recommendation)}</span></p>
<p style="color:#444">${esc(r.recommendationReason)}</p>
<p style="margin-top:24px"><a href="${siteUrl()}/future-accelerator/validator?id=${encodeURIComponent(v.id)}" style="background:#D4A017;color:#000;padding:12px 20px;border-radius:4px;text-decoration:none;font-size:14px">OPEN MY VALIDATION</a></p>
${nextStepsHtml(warRoomUrl(v.id, last.title, 'email'), last.title)}
<p style="font-size:11px;color:#999;margin-top:28px">This score is an AI-assisted preliminary assessment, not proof of market demand or a guarantee of commercial success.</p>
</div></div></body></html>`
}

export async function sendMail(to: string, subject: string, html: string, attachments: Attachment[] = []) {
  if (!emailConfigured()) return { sent: false, reason: 'Email is not configured on this server yet.' }
  await transport().sendMail({ from: process.env.EMAIL_FROM || process.env.EMAIL_USER, to, subject, html, attachments })
  return { sent: true as const }
}
