export type CareerPath = 'founder' | 'hired' | 'unsure'
export type Risk = 'Low' | 'Neutral' | 'High'

export type Stage =
  | 'welcome'
  | 'playbook'
  | 'station1'
  | 'fiveUIntro'
  | 'fiveU'
  | 'fiveUSummary'
  | 'ua'
  | 'uaConfirm'
  | 'location'
  | 'gaps'
  | 'opportunities'
  | 'top5'
  | 'map'
  | 'register'
  | 'saved'
  | 'validate'
  | 'final'
  | 'about'
  | 'results'

export interface ChatMsg {
  id: string
  role: 'ai' | 'user'
  text: string
  /** Optional rich card rendered under the message */
  card?: 'fiveUTable' | 'ua' | 'gaps' | 'opportunities' | 'refinement' | 'mapPreview' | 'playbook' | 'station1' | 'fiveUIntro'
  /** For user answers: the answer key (e.g. "u1.0", "ua.2") so the bubble can be edited */
  ref?: string
}

export interface HumanEdge {
  trust: number
  presence: number
  judgment: number
  local: number
  relationships: number
}

export interface Idea {
  id: string
  idea: string
  description: string
  problem: string
  solution: string
  audience: string
  risk: Risk
  keywords: string[]
  firstStep: string
  humanEdge: HumanEdge
  /** Why this fits the person, one sentence */
  whyYou?: string
  origin?: 'generated' | 'combine' | 'zero-budget'
}

export interface Job {
  id: string
  title: string
  emerging: boolean
  description: string
  solution: string
  targetCompanies: string[]
  risk: Risk
  keywords: string[]
  portfolioStep: string
  humanEdge: HumanEdge
}

export interface MarketGap {
  id: string
  problem: string
  who: string
  why: string
  uLinks: string[]
  advantage: string
  willingnessToPay: string
}

export interface Refinement {
  id: string
  action: 'combine' | 'zero-budget' | 'skeptic'
  targetIds: string[]
  targetKind: 'idea' | 'job'
  summary: string
  challenges?: { challenge: string; response: string }[]
  newIdeaId?: string
  at: string
}

export interface CareerMap {
  generatedAt: string
  nextActions: { thisWeek: string; in14Days: string; in30Days: string }
  pitch: { advantage: string; problem: string; solution: string }
  strengths: string[]
}

export interface Profile {
  fullName: string
  email: string
  status: string
  institution: string
  institutionType: string
  website?: string
  city: string
  state: string
  country: string
  consentEmail: boolean
}

/** The 50-second survey: everything the visitor tapped. */
export interface QuickProfile {
  path: CareerPath
  interests: string[]
  skills: string[]
  helps: string[]
  /** U4 Survived */
  lived: string[]
  /** U5 Walked */
  walked?: string[]
  extra?: string
  location: { city: string; state: string; country: string }
}

/** The War Room pitch for the visitor's chosen idea (read by the War Room via the handoff route). */
export interface PitchDoc {
  id: string
  sessionId: string
  idea: { title: string; description: string; audience: string }
  pitch: { advantage: string; problem: string; solution: string }
  updatedAt: string
}

export interface FASession {
  id: string
  userId?: string
  quick?: QuickProfile
  pitchRef?: string
  createdAt: string
  updatedAt: string
  stage: Stage
  path?: CareerPath
  messages: ChatMsg[]
  /** keys like "u1.0" … "u5.2"; null = skipped */
  answers: Record<string, string | null>
  uaQuestions: string[]
  uaAnswers: (string | null)[]
  unfairAdvantage?: { statement: string; explanation: string; confirmed: boolean }
  location?: { city: string; state: string; country: string }
  gaps: MarketGap[]
  selectedGaps: string[]
  ideas: Idea[]
  jobs: Job[]
  refinements: Refinement[]
  topIdeas: string[]
  topJobs: string[]
  map?: CareerMap
  emailedAt?: string
  aiMode?: 'live' | 'demo'
  limitations?: string[]
}

export interface User {
  id: string
  email: string
  passwordHash: string
  profile: Profile
  createdAt: string
  sessionIds: string[]
}

export interface ScoreItem {
  key: string
  label: string
  weight: number
  score: number
  reason: string
  evidence: string
  missing: string
  improvement: string
}

export interface ValidationReport {
  summary: string
  problem: string
  idealCustomer: string
  demand: string
  marketSize: { tam: string; sam: string; som: string; assumptions: string }
  competitors: { name: string; type: 'Direct' | 'Indirect' | 'Alternative'; notes: string; verified: boolean }[]
  marketGaps: string[]
  valueProposition: string
  businessModel: string
  revenue: string
  costs: string
  failureRisks: { risk: string; why: string; severity: 'Low' | 'Medium' | 'High'; evidence: string; mitigation: string }[]
  successStrategies: string[]
  pivots: string[]
  scorecard: ScoreItem[]
  total: number
  recommendation: 'GO' | 'CONDITIONAL GO' | 'NO-GO'
  recommendationReason: string
  verifiedFacts: string[]
  assumptions: string[]
  missingInfo: string[]
  mvp: string
  sevenDayPlan: string[]
  thirtyDayPlan: string[]
  interviewQuestions: string[]
  experiments: Experiment[]
  nextSteps: string[]
  sources: { title: string; url: string }[]
  researchedAt: string
}

export interface Experiment {
  id: string
  experiment: string
  hypothesis: string
  audience: string
  action: string
  expectedEvidence: string
  actualResult?: string
  meaning?: string
  nextAction?: string
}

export interface Validation {
  id: string
  sessionId: string
  userId?: string
  ideaId?: string
  title: string
  description: string
  url?: string
  createdAt: string
  updatedAt: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  versions: { version: number; title: string; description: string; report: ValidationReport; at: string }[]
  aiMode?: 'live' | 'demo'
}
