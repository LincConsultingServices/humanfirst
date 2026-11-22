// One-time Gmail API connection for HumanFirst emails.
//
// Before running: in Google Cloud Console create an OAuth client (type "Desktop app") and put
//   GMAIL_CLIENT_ID=...
//   GMAIL_CLIENT_SECRET=...
// in .env.local. Then run:  pnpm email:connect
//
// It opens a Google sign-in link. Sign in with the Gmail account that should SEND the emails and
// allow access. The script then saves GMAIL_REFRESH_TOKEN (and EMAIL_USER, if empty) into .env.local.
// Nothing is sent anywhere except Google.
import fs from 'node:fs'
import http from 'node:http'

const ENV_FILE = '.env.local'
const PORT = 53682
const REDIRECT = `http://localhost:${PORT}`
// Sending through Gmail with OAuth (SMTP XOAUTH2) needs the full Gmail scope.
const SCOPE = 'https://mail.google.com/'

function readEnv() {
  const env = {}
  if (!fs.existsSync(ENV_FILE)) return env
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  return env
}

function setEnv(key, value) {
  let text = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : ''
  const re = new RegExp(`^[ \\t]*${key}[ \\t]*=[^\\r\\n]*`, 'm')
  if (re.test(text)) text = text.replace(re, `${key}=${value}`)
  else text = `${text.replace(/\s*$/, '')}\n${key}=${value}\n`
  fs.writeFileSync(ENV_FILE, text)
}

const env = readEnv()
if (!env.GMAIL_CLIENT_ID || !env.GMAIL_CLIENT_SECRET) {
  console.error('Add GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET to .env.local first (see docs/EMAIL_SETUP.md).')
  process.exit(1)
}

const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id: env.GMAIL_CLIENT_ID,
  redirect_uri: REDIRECT,
  response_type: 'code',
  scope: SCOPE,
  access_type: 'offline',
  prompt: 'consent',
}).toString()

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  if (!code && !error) {
    res.writeHead(404).end()
    return
  }
  const finish = (status, message) => {
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`<body style="font-family:Arial;background:#000;color:#fff;padding:40px"><h2 style="color:#D4A017">HumanFirst</h2><p>${message}</p></body>`)
    server.close()
  }
  if (error) {
    console.error(`Google returned an error: ${error}`)
    finish(400, `Not connected: ${error}. You can close this tab and run the command again.`)
    process.exitCode = 1
    return
  }
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: env.GMAIL_CLIENT_ID, client_secret: env.GMAIL_CLIENT_SECRET, redirect_uri: REDIRECT, grant_type: 'authorization_code',
      }),
    })
    const tokens = await tokenRes.json()
    if (!tokenRes.ok || !tokens.refresh_token) throw new Error(tokens.error_description || tokens.error || 'No refresh token returned')
    const profile = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    }).then((r) => r.json())
    setEnv('GMAIL_REFRESH_TOKEN', tokens.refresh_token)
    if (profile.emailAddress && !env.EMAIL_USER) setEnv('EMAIL_USER', profile.emailAddress)
    console.log(`Connected: emails will be sent from ${profile.emailAddress ?? env.EMAIL_USER}.`)
    console.log('Saved GMAIL_REFRESH_TOKEN to .env.local. Next: pnpm email:test')
    finish(200, `Connected. HumanFirst emails will be sent from <b>${profile.emailAddress ?? 'your Gmail'}</b>. You can close this tab.`)
  } catch (e) {
    console.error('Could not connect Gmail:', e.message)
    finish(500, `Not connected: ${e.message}. You can close this tab and run the command again.`)
    process.exitCode = 1
  }
})

server.listen(PORT, () => {
  console.log('Open this link, sign in with the Gmail account that should send the emails, and allow access:\n')
  console.log(authUrl + '\n')
  console.log(`Waiting for Google to redirect back to ${REDIRECT} …`)
})
