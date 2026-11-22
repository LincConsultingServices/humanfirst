# Email setup (Gmail API through Google Cloud)

HumanFirst sends report PDFs ("Email me the report", the Career Accelerator Map, the welcome email
after sign-up) through Gmail. There are two ways to connect. Use **one**:

- **A. Gmail API (Google Cloud OAuth)**: recommended, no password stored.
- B. Gmail App Password: simpler, but needs 2-step verification and stores an app password.

If both are filled in, the Gmail API is used.

---

## A. Gmail API (Google Cloud Console)

You need the Gmail account that should **send** the emails (for example the HumanFirst address).

### 1. Create or choose a project
1. Open https://console.cloud.google.com/ and sign in.
2. Top bar → project picker → **New project** (for example "HumanFirst Email") → **Create**, then select it.

### 2. Turn on the Gmail API
1. Menu → **APIs & Services → Library**.
2. Search **Gmail API** → **Enable**.

### 3. Set up the consent screen
1. Menu → **APIs & Services → OAuth consent screen** (on newer consoles: **Google Auth Platform → Branding**).
2. App name: **HumanFirst**. Support email: your email. Developer contact: your email. Save.
3. **Audience**: choose **External** (or **Internal** if the sending address is in a Google Workspace you manage).
4. If External and still "Testing": under **Test users**, **Add users** → add the Gmail address that will send the emails.

> While the app is in "Testing", Google expires the connection after 7 days. For a permanent
> connection, click **Publish app** (Google may ask for verification because the Gmail scope is
> sensitive), or use an Internal app inside Google Workspace.

### 4. Create the OAuth client
1. Menu → **APIs & Services → Credentials** (or **Google Auth Platform → Clients**).
2. **Create credentials → OAuth client ID**.
3. Application type: **Desktop app**. Name: "HumanFirst email". **Create**.
4. Copy the **Client ID** and **Client secret**.

### 5. Put them in `.env.local` (in the humanfirst folder)
```
GMAIL_CLIENT_ID=paste-client-id-here
GMAIL_CLIENT_SECRET=paste-client-secret-here
EMAIL_FROM=HumanFirst <the-sending-address@gmail.com>
```

### 6. Connect Gmail once
```bash
pnpm email:connect
```
It prints a Google link. Open it, sign in with the **sending** Gmail account and click **Allow**.
The command saves `GMAIL_REFRESH_TOKEN` (and `EMAIL_USER`) into `.env.local` for you.

### 7. Test
```bash
pnpm email:test
```
You should receive "HumanFirst email test". Then restart the site (`pnpm build`, then start it again).

### On Cloud Run
Add the same four values as environment variables (or Secret Manager secrets) on the service:
`GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `EMAIL_USER` (+ optional `EMAIL_FROM`).

---

## B. Gmail App Password (alternative)
1. Turn on 2-step verification for the Gmail account.
2. Create an App Password: https://myaccount.google.com/apppasswords
3. In `.env.local`:
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=the-sending-address@gmail.com
EMAIL_PASSWORD=the-16-character-app-password
```
4. `pnpm email:test`
