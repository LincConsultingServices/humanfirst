// Sends one test email using the EMAIL_* settings in .env.local.
// Usage: pnpm email:test            (sends to EMAIL_USER)
//        pnpm email:test you@x.com  (sends to that address)
import fs from 'node:fs'
import nodemailer from 'nodemailer'

const env = {}
for (const file of ['.env.local', '.env']) {
  if (!fs.existsSync(file)) continue
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}
const useGmailApi = ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN', 'EMAIL_USER'].every((k) => env[k])
const useSmtp = ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASSWORD'].every((k) => env[k])
if (!useGmailApi && !useSmtp) {
  const gm = ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN', 'EMAIL_USER'].filter((k) => !env[k])
  console.error(`Email is not set up. For the Gmail API, still missing in .env.local: ${gm.join(', ')}`)
  if (env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && !env.GMAIL_REFRESH_TOKEN) console.error('Run: pnpm email:connect')
  console.error('Full steps: docs/EMAIL_SETUP.md')
  process.exit(1)
}
console.log(`Using ${useGmailApi ? 'Gmail API (Google Cloud OAuth)' : 'SMTP'} as ${env.EMAIL_USER}`)
const to = process.argv[2] || env.EMAIL_USER
const transporter = useGmailApi
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { type: 'OAuth2', user: env.EMAIL_USER, clientId: env.GMAIL_CLIENT_ID, clientSecret: env.GMAIL_CLIENT_SECRET, refreshToken: env.GMAIL_REFRESH_TOKEN },
    })
  : nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: parseInt(env.EMAIL_PORT || '587'),
      secure: env.EMAIL_SECURE === 'true',
      auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASSWORD },
    })
try {
  await transporter.verify()
  const info = await transporter.sendMail({
    from: env.EMAIL_FROM || env.EMAIL_USER,
    to,
    subject: 'HumanFirst email test',
    html: '<p>Email from the HumanFirst Future Accelerator is working.</p>',
  })
  console.log(`Sent to ${to} (message id ${info.messageId}). Email is set up correctly.`)
} catch (e) {
  console.error('Email test failed:', e.message)
  if (/invalid_grant/.test(e.message)) {
    console.error('Google rejected the saved connection (it may have expired, e.g. 7 days in "Testing" mode). Run: pnpm email:connect')
  }
  if (/Invalid login|Username and Password not accepted|535/.test(e.message) && !useGmailApi) {
    console.error('For Gmail, EMAIL_PASSWORD must be a 16-character App Password, not your normal password: https://myaccount.google.com/apppasswords')
  }
  process.exit(1)
}
