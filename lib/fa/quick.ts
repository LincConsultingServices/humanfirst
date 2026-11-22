// Fixed data and plain rules for the 50-second Future Accelerator survey.
// Everything here is deterministic application logic (no AI): the chip lists,
// which "people come to you for" chips to suggest, the location guess, the
// AI-risk rule and the War Room pitch link.
import type { HumanEdge, Idea, Risk } from './types'

export const INTERESTS = [
  'Technology', 'Education', 'Health & wellbeing', 'Food', 'Finance & money', 'Creative & media',
  'Sports & fitness', 'Fashion & beauty', 'Travel', 'Environment', 'Community', 'Retail & shopping',
]

export const SKILLS = [
  'Coding', 'Teaching', 'Sales', 'Marketing & social media', 'Design', 'Accounts / GST', 'Operations',
  'Customer service', 'Writing', 'Data & analysis', 'Cooking', 'Healthcare & care', 'Repairs & hands-on', 'Managing people',
]

// U2 HELP: what people usually ask someone with each interest for (suggested after U1 is answered).
const HELPS_BY_INTEREST: Record<string, string[]> = {
  Technology: ['Fixing tech problems', 'Choosing gadgets and apps'],
  Education: ['Explaining things simply', 'Exam and study help'],
  'Health & wellbeing': ['Health and fitness tips'],
  Food: ['Recipes and cooking tips'],
  'Finance & money': ['Tax and money questions', 'Budgeting'],
  'Creative & media': ['Making things look good', 'Writing and editing'],
  'Sports & fitness': ['Training and fitness plans'],
  'Fashion & beauty': ['Style and beauty advice'],
  Travel: ['Planning trips'],
  Environment: ['Living more sustainably'],
  Community: ['Organising people and events'],
  'Retail & shopping': ['Finding a good deal'],
}
const GENERAL_HELPS = ['Career advice', 'Listening and support', 'Getting organised']

export function helpsFor(interests: string[]) {
  const out: string[] = []
  for (const i of interests) for (const h of HELPS_BY_INTEREST[i] ?? []) if (!out.includes(h)) out.push(h)
  for (const h of GENERAL_HELPS) if (!out.includes(h)) out.push(h)
  return out.slice(0, 7)
}

// U4 SURVIVED (optional)
export const SURVIVED = [
  'Moved to a new city or country', 'Lost a job', 'A money setback', 'A health challenge', 'Cared for family', 'A failure I learned from',
]

// U5 WALKED (optional)
export const WALKED = [
  'First in my family at college', 'Small town to big city', 'Worked while studying', 'Grew up in a family business',
  'Changed careers', 'Life as a parent or carer', 'Lived abroad',
]

export const LIMITS = { interests: 2, helps: 2, skills: 3, lived: 2, walked: 2 }

// Location from the browser's time zone: no GPS and no permission prompt. Country-level only,
// because a time zone covers a whole region; the visitor can change it with one tap.
const TZ_COUNTRY: Record<string, string> = {
  'Asia/Kolkata': 'India', 'Asia/Calcutta': 'India', 'Asia/Dubai': 'United Arab Emirates', 'Asia/Singapore': 'Singapore',
  'Asia/Karachi': 'Pakistan', 'Asia/Dhaka': 'Bangladesh', 'Asia/Colombo': 'Sri Lanka', 'Asia/Kathmandu': 'Nepal',
  'Asia/Kuala_Lumpur': 'Malaysia', 'Asia/Manila': 'Philippines', 'Asia/Jakarta': 'Indonesia', 'Asia/Riyadh': 'Saudi Arabia',
  'Asia/Qatar': 'Qatar', 'Asia/Bangkok': 'Thailand', 'Asia/Ho_Chi_Minh': 'Vietnam', 'Asia/Saigon': 'Vietnam',
  'Asia/Tokyo': 'Japan', 'Asia/Shanghai': 'China', 'Asia/Hong_Kong': 'Hong Kong', 'Asia/Seoul': 'South Korea',
  'Europe/London': 'United Kingdom', 'Europe/Dublin': 'Ireland', 'Europe/Berlin': 'Germany', 'Europe/Paris': 'France',
  'Europe/Madrid': 'Spain', 'Europe/Rome': 'Italy', 'Europe/Amsterdam': 'Netherlands',
  'Africa/Lagos': 'Nigeria', 'Africa/Nairobi': 'Kenya', 'Africa/Johannesburg': 'South Africa', 'Africa/Cairo': 'Egypt',
  'America/Toronto': 'Canada', 'America/Vancouver': 'Canada', 'America/Mexico_City': 'Mexico', 'America/Sao_Paulo': 'Brazil',
  'Pacific/Auckland': 'New Zealand',
}

export function guessLocation(): { city: string; state: string; country: string } {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (TZ_COUNTRY[tz]) return { city: '', state: '', country: TZ_COUNTRY[tz] }
    if (tz.startsWith('America/')) return { city: '', state: '', country: 'United States' }
    if (tz.startsWith('Australia/')) return { city: '', state: '', country: 'Australia' }
  } catch {
    /* fall through */
  }
  return { city: '', state: '', country: '' }
}

export const locationLabel = (l?: { city: string; state: string; country: string }) =>
  l ? [l.city, l.state, l.country].filter(Boolean).join(', ') : ''

// AI disruption risk from the five human-edge factors (each 0–2). A fixed rule, so the
// same factors always give the same badge.
export function riskFromEdge(h: HumanEdge): Risk {
  const total = h.trust + h.presence + h.judgment + h.local + h.relationships
  if (total >= 7) return 'Low'
  if (total >= 4) return 'Neutral'
  return 'High'
}

// The War Room pitch ("Because I have… / I see a problem… / My solution is…") for any idea.
// Built from the idea's own fields, so switching ideas never needs another AI call.
export function pitchFor(idea: Idea, advantage: string) {
  return { advantage, problem: idea.problem, solution: idea.solution }
}

export const WAR_ROOM_URL = 'https://enterthewarroom.humanfirstbykk.com/'
// Same destination as the CEO City card on the Experience page.
export const CEO_CITY_URL = 'https://ceocity.humanfirstbykk.com/'
// The same booking link the site header and hero use.
export const BOOKING_URL = 'https://calendly.com/kk-humanfirst/30min'

export function warRoomUrl(ref: string | undefined, title: string, from = 'future_accelerator') {
  const q = new URLSearchParams({ utm_source: 'humanfirst', utm_medium: from })
  if (ref) q.set('hf_ref', ref)
  if (title) q.set('hf_idea', title.slice(0, 120))
  return `${WAR_ROOM_URL}?${q.toString()}`
}

export const riskLegend = {
  Low: 'Strong human advantage and lower likelihood of full AI replacement.',
  Neutral: 'AI may automate some tasks, but human involvement remains important.',
  High: 'Greater exposure to automation and AI-driven disruption.',
}

export const humanEdgeFactors = [
  { key: 'trust', label: 'Human Trust' },
  { key: 'presence', label: 'Physical Presence' },
  { key: 'judgment', label: 'Judgment' },
  { key: 'local', label: 'Local Knowledge' },
  { key: 'relationships', label: 'Long-term Relationships' },
] as const
