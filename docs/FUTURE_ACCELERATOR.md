# HumanFirst Future Accelerator: design audit, architecture and setup

This document covers the new **Future Accelerator AI** (Phase 1 – Future Accelerator 2.0), the
**AI Business Idea Validator**. These are additions to the
existing site. No existing page, navigation item, colour or font was changed. The only edit to an
existing page is one new Future Accelerator card on `/experience`, in the same card format. The Hired
path sends visitors to the existing CEO City experience.

---

## 1. Design audit (source of truth for every new component)

The audit used the repo's own source code (`app/experience/page.tsx`, `components/header.tsx`,
`components/hero-section.tsx`, `app/war-room/page.tsx`, `app/globals.css`). It was checked against
the live site at https://humanfirstbykk.com/experience, where the computed styles match the repo.

| Token | Value in the existing site | Where it's used |
|---|---|---|
| Page background (dark pages) | `#000` (`bg-black`) | Header, Experience, CEO City, hero |
| Card surface | `#111` (`bg-[#111]`), border `border-gray-800`, radius 10px (`rounded-lg`) | Experience cards |
| Brand gold | `#D4A017` | Every primary CTA, eyebrows, accents |
| Primary button | gold background, black text, `text-sm font-medium`, radius 4px (`rounded`), `px-6 py-3`, hover `scale-105 opacity-90` | Experience / header CTAs |
| Secondary button | transparent, 2px gold border, gold text, fills gold on hover | Hero "BOOK A CALL" |
| Eyebrow | `text-sm font-medium tracking-[0.2em] text-[#D4A017]` uppercase | Experience, CEO City |
| Headings | Geist, `font-black` (900), uppercase display titles, `leading-[0.95]` | All pages |
| Body text | Geist 16px, `text-gray-300` on black, `text-gray-700` on white | All pages |
| Light sections | white background, gold left border `rgba(212,160,23,0.1)` + `border-l-4 #D4A017` | War Room "Key Benefits" |
| Secondary accent | `#FF6B35` (War Room fire orange) | Offerings section, used only for "High" AI-risk badges |
| Motion | `transition-all duration-300`, `hover:scale-105`; no other animation | Buttons and cards |
| Font | Geist / Geist Mono (`next/font`), set in `app/globals.css` `@theme` | Global |
| Breakpoints | Tailwind defaults (`sm` 640, `md` 768, `lg` 1024); 16px (`px-4`) mobile gutter, `md:px-6` | Global |

The shared class strings live in `lib/fa/ui.ts`, so every new screen uses these exact values.
New components reuse `Header` and `Footer` unchanged. No new fonts, gradients or colours were added.

## 2. What was built (rebuild, approved proposal v2)

The journey goal: **one click to start, a 5 U's survey of 40–50 seconds, then one click to pitch the idea in the War Room.** Every journey ends in the War Room (no career / CEO City route).

| Step | What the visitor does | Notes |
|---|---|---|
| Landing (first screen on the homepage) | Click **Discover my opportunities** | "How it works" opens three lines in place. Returning visitors see **See my opportunities** |
| About you (one screen) | About 6 taps in 3 chip groups | Interests, skills, "what people come to you for" (suggested from the skills). Optional "lived through" and a free-text box. Location comes from the browser time zone |
| Working | Wait about 8 seconds | One AI request returns the edge, 3 ideas, 3 roles and the pitch |
| Results | **Pitch this in War Room →** | Best idea with a ready 3-line pitch, 2 more ideas ("Pitch this instead"), "Show 3 different ideas". Optional: edit pitch, quick validation, save & email map, start again |

| Route | Purpose |
|---|---|
| `/` | The full-screen Future Accelerator opens first (`components/fa/home-launcher.tsx`) |
| `/future-accelerator` | The same experience under the site header (`components/fa/accelerator.tsx`) |
| `/future-accelerator/validator` | Optional Business Idea Validator. From the results it starts on its own (`?idea=…&auto=1`) |
| `/future-accelerator/map` · `/dashboard` · `/admin` | Career Accelerator Map, saved results, lead dashboard (with median survey time) |

**Plain code (no AI):** chip lists and suggestions, location guess, the AI-risk badge (sum of five human-edge factors: 7+ Low, 4–6 Neutral, 0–3 High), switching the pitch to another idea, saving, PDF and email (`lib/fa/quick.ts`).
**AI:** one fast request for the results (`quickOpportunities` in `lib/fa/prompts.ts`). Research with sources, competitors and risks happen only in the optional validator.

### Backend (`app/api/fa/*`, `lib/fa/*`)

- **AI** (`lib/fa/ai.ts`): Claude via `@anthropic-ai/sdk`, model `claude-opus-5-5` (override with
  `FA_MODEL`). Structured outputs use Zod schemas, and server-side refusal fallbacks are on
  (`fallbacks: "default"`). Market research for the validator uses the Claude web search server
  tool, and the report lists every source URL. Prompts live only on the server (`lib/fa/prompts.ts`).
- **Demo mode**: with no `ANTHROPIC_API_KEY`, every AI step returns clearly labelled demo output built
  from the user's own answers, so the full journey can be tested end to end. The UI shows a
  "Demo mode" badge.
- **Storage** (`lib/fa/store.ts`): JSON documents on disk under `FA_DATA_DIR` (default `.data/`),
  with separate collections for sessions, users, validations and events.
  **Cloud Run's filesystem is ephemeral**, so production needs a persistent store first. The store
  is a small interface (`get / put / list`), so a Firestore adapter can replace it in one file.
- **Sessions**: an anonymous session starts on the first visit (signed httpOnly cookie). Every
  answer is saved immediately, and refreshing resumes at the last step. On register or login, the
  anonymous session and its validations are attached to the account.
- **Auth**: email + password (scrypt hash) with a signed httpOnly cookie (`AUTH_SECRET`).
- **Email**: reuses the site's existing nodemailer setup (`EMAIL_*` variables). It sends the map
  only when the user ticks consent.
- **Analytics**: events are stored server-side (`agent_started`, `path_selected`, `five_us_completed`,
  `unfair_advantage_generated`, `gaps_selected`, `opportunities_generated`, `top5_selected`,
  `registration_completed`, `pdf_downloaded`, `validation_completed`, `war_room_clicked`,
  `ceo_city_clicked`, `booking_clicked`) and shown on the admin dashboard.

### War Room handoff

**Pitch this in War Room** links to `https://enterthewarroom.humanfirstbykk.com/?hf_ref=p_…&hf_idea=…`. `GET /api/fa/handoff/p_…` returns the chosen idea and the 3-line pitch (no name, email or answers). The validator's "Take your idea to War Room" link works the same way and is described here:

The validator link goes to `https://enterthewarroom.humanfirstbykk.com/` with
non-sensitive query parameters: `hf_ref` (validation id), `hf_idea`, `hf_score`, `hf_rec`, plus `utm_*`.
The War Room can read the full summary (idea, score, recommendation, key risks and next actions,
with no personal answers) from `GET /api/fa/handoff/{hf_ref}`. That endpoint allows CORS from the
War Room origin. The existing War Room site and its subscription and payment system are not
touched. Reading these parameters on the War Room side is a change to that separate project.

## 3. Environment variables (add to `.env.local` / Cloud Run)

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | For real AI | Without it the app runs in demo mode |
| `FA_MODEL` | No | Defaults to `claude-opus-5-5` |
| `FA_FAST_MODEL` | No | Model for the 8-second results request. Defaults to `FA_MODEL`. Set a faster model here if live timings are too slow |
| `AUTH_SECRET` | **Yes in production** | Signs session/login cookies (any long random string) |
| `ADMIN_TOKEN` | For lead dashboard | Password for `/future-accelerator/admin` |
| `FA_DATA_DIR` | No | Where JSON data is written (default `.data`) |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_SECURE` / `EMAIL_USER` / `EMAIL_PASSWORD` / `EMAIL_FROM` | For email | Same variables the existing contact form uses |
| `NEXT_PUBLIC_SITE_URL` | No | Absolute links in emails (default `https://humanfirstbykk.com`) |

## 4. Open items that need the owner

1. **Playbook.** No playbook text appears on screen any more. Its method lives in the survey design and the AI prompt.
2. **Production database.** Replace `lib/fa/store.ts` with Firestore (or another database) before going live on Cloud Run.
3. **War Room side.** To prefill the idea inside War Room, that site needs to read `hf_ref` and call the handoff endpoint.
4. **"Frank" Custom GPT.** It is not integrated, because a private Custom GPT can't be called from a
   website. If its instructions are shared, they can be added to the validator system prompt in
   `lib/fa/prompts.ts`.
5. **Server-generated PDF attachment.** Today the PDF comes from the browser's print-to-PDF on a
   print-styled page, and the email carries the full map as HTML. A server-rendered PDF attachment
   can be added later.
