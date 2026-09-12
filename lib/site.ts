/**
 * Where the War Room application lives.
 *
 * The marketing site does not host the War Room — it links out to a separately
 * deployed Next.js app (Cloud Run, project `warroom-498513`). That host used to
 * be hardcoded in eight places across the header, footer, hero, offerings and
 * the Start With You page, so a domain swap only had to miss one of them to
 * leave a dead "ENTER WAR ROOM" button. It is resolved here, once.
 *
 * `warroom.humanfirstbykk.com` is the host the rest of the platform agrees on:
 * the academy backend's `MAIN_SITE_URL` default (internal/config/config.go) and
 * The City frontend's register redirect (src/framework/config/appConfig.ts)
 * both point at it.
 *
 * To move the app to another host, set NEXT_PUBLIC_WAR_ROOM_URL rather than
 * editing call sites. It is inlined into the bundle at build time, so a change
 * only takes effect on a rebuild and redeploy.
 */
const configured = process.env.NEXT_PUBLIC_WAR_ROOM_URL?.trim()

export const WAR_ROOM_URL = (
  configured || 'https://warroom.humanfirstbykk.com'
).replace(/\/+$/, '')
