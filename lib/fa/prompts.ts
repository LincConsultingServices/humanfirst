// Server-only: system prompts, output schemas and the AI tasks.
import { z } from 'zod/v4'
import { aiEnabled, chat, generate, research, type Turn } from './ai'
import * as mock from './mock'
import { locationLabel, riskFromEdge } from './quick'
import type { FASession, Idea, Job, QuickProfile, Validation, ValidationReport } from './types'

const uid = () => Math.random().toString(36).slice(2, 10)

// ---------------------------------------------------------------- quick opportunities (the 50-second survey)

export function quickText(q?: QuickProfile) {
  if (!q) return ''
  return [
    'Goal: find a business idea to pitch in the War Room',
    `U1 Love (what they enjoy): ${q.interests.join(', ')}`,
    `U2 Help (what people come to them for): ${q.helps.join(', ')}`,
    `U3 Learned (skills): ${q.skills.join(', ')}`,
    q.lived?.length ? `U4 Survived (hard things they came through): ${q.lived.join(', ')}` : '',
    q.walked?.length ? `U5 Walked (journeys they know from the inside): ${q.walked.join(', ')}` : '',
    q.extra ? `In their own words: ${q.extra}` : '',
    `Location: ${locationLabel(q.location) || 'not given'}`,
  ].filter(Boolean).join('\n')
}

const QUICK_SYSTEM = `You are the HumanFirst opportunity engine. From a few tapped answers you infer what makes a person valuable and propose specific, realistic opportunities they could act on this week.
- Use the person's 5 U's (Love, Help, Learned, Survived, Walked). Their unfair advantage is where these overlap; U4 and U5, when given, often point to problems they understand from the inside.
- Every idea and role must connect clearly to the person's own answers. Say why in one sentence written to "you".
- Be specific (who pays, for what) rather than generic. Prefer opportunities that depend on human trust, presence, judgment, local knowledge and relationships.
- Short fields: one sentence each, no lists inside fields, plain everyday English, no hype.
- Never invent statistics, market sizes or named local businesses.
- The pitch advantage is first person and completes the sentence "Because I have…".`

const HumanEdge = z.object({
  trust: z.number().describe('0-2'), presence: z.number().describe('0-2'), judgment: z.number().describe('0-2'),
  local: z.number().describe('0-2'), relationships: z.number().describe('0-2'),
})
const QuickSchema = z.object({
  edge: z.string().describe('one sentence starting with "You", max 25 words: the combination that makes this person valuable'),
  strengths: z.array(z.string()).describe('3 short strengths, 1-3 words each'),
  pitchAdvantage: z.string().describe('first person, completes "Because I have …", max 18 words, no leading "Because I have"'),
  ideas: z.array(z.object({
    name: z.string().describe('specific business name-like title, max 7 words'),
    oneLiner: z.string(),
    problem: z.string().describe('the problem customers have, one sentence'),
    audience: z.string().describe('who pays'),
    solution: z.string().describe('what this person offers, first person, one sentence'),
    whyYou: z.string().describe('why this fits them, addressed as "you", one sentence'),
    firstStep: z.string().describe('a free first step this week'),
    keywords: z.array(z.string()),
    humanEdge: HumanEdge,
  })).describe('exactly 3, best fit first'),
  nextActions: z.object({ thisWeek: z.string(), in14Days: z.string(), in30Days: z.string() }),
})

const clamp = (h: z.infer<typeof HumanEdge>) =>
  Object.fromEntries(Object.entries(h).map(([k, v]) => [k, Math.max(0, Math.min(2, Math.round(Number(v) || 0)))])) as z.infer<typeof HumanEdge>

export type QuickResult = {
  edge: string
  strengths: string[]
  pitchAdvantage: string
  ideas: Idea[]
  jobs: Job[]
  nextActions: { thisWeek: string; in14Days: string; in30Days: string }
}

export async function quickOpportunities(q: QuickProfile, exclude: string[] = []): Promise<QuickResult> {
  if (!aiEnabled()) return mock.quick(q, exclude)
  const out = await generate({
    system: QUICK_SYSTEM,
    schema: QuickSchema,
    effort: 'low',
    fast: true,
    prompt: `${quickText(q)}${exclude.length ? `\n\nAlready shown (suggest different ones): ${exclude.join('; ')}` : ''}\n\nReturn the person's edge, 3 strengths, the pitch advantage, exactly 3 business ideas (best fit first), and next actions for the #1 idea.`,
  })
  return {
    edge: out.edge,
    strengths: out.strengths.slice(0, 3),
    pitchAdvantage: out.pitchAdvantage.replace(/^because i have\s*/i, ''),
    ideas: out.ideas.slice(0, 3).map((i) => {
      const humanEdge = clamp(i.humanEdge)
      return {
        id: uid(), idea: i.name, description: i.oneLiner, problem: i.problem, solution: i.solution, audience: i.audience,
        whyYou: i.whyYou, risk: riskFromEdge(humanEdge), keywords: i.keywords.slice(0, 5), firstStep: i.firstStep, humanEdge, origin: 'generated' as const,
      }
    }),
    jobs: [],
    nextActions: out.nextActions,
  }
}

// ---------------------------------------------------------------- validator
const VALIDATOR_SYSTEM = `You are the HumanFirst Business Advisor inside the HumanFirst AI Business Idea Validator.
You are a critical business mentor, not a cheerleader. Your goal is to help the founder make a better decision before investing money, time or effort.
- Be honest and specific. Explain your reasoning.
- Ask ONE or TWO focused follow-up questions at a time when important information is missing (problem, who pays, current alternatives, differentiation, launch location, local vs national, founder skills/resources).
- Challenge assumptions; name the reasons the idea could fail and what would improve it.
- Never invent competitors, market sizes, customer evidence, statistics or sources. If you don't know, say so and say how to find out.
- Distinguish verified facts, estimates and assumptions.
- AI analysis cannot prove demand. Always point toward real-world tests (customer interviews, landing page, pre-orders, pilots).
- Keep replies under 180 words, plain text, short paragraphs or "-" bullets. No markdown headings.`

export function validationContext(v: Validation, s?: FASession | null) {
  const parts = [`BUSINESS IDEA: ${v.title}\n${v.description}${v.url ? `\nExisting website/product: ${v.url}` : ''}`]
  if (s) {
    if (s.unfairAdvantage) parts.push(`FOUNDER'S UNFAIR ADVANTAGE: ${s.unfairAdvantage.statement}`)
    if (s.location && locationLabel(s.location)) parts.push(`FOUNDER LOCATION: ${locationLabel(s.location)}`)
    if (s.quick) parts.push(`FOUNDER PROFILE:\n${quickText(s.quick)}`)
    const idea = s.ideas.find((i) => i.id === v.ideaId)
    if (idea) parts.push(`ORIGINAL GENERATED IDEA DETAILS: ${JSON.stringify(idea)}`)
  }
  return parts.join('\n\n')
}

export async function advisorReply(v: Validation, s: FASession | null): Promise<string> {
  if (!aiEnabled()) return mock.advisorReply(v)
  const history: Turn[] = v.messages.map((m) => ({ role: m.role, content: m.content }))
  history[0] = { role: 'user', content: `${validationContext(v, s)}\n\n---\n${history[0]?.content ?? 'Please start the validation.'}` }
  return chat(VALIDATOR_SYSTEM, history)
}

const ScoreItemSchema = z.object({
  key: z.string(), label: z.string(), weight: z.number(), score: z.number(),
  reason: z.string(), evidence: z.string(), missing: z.string(), improvement: z.string(),
})
const ReportSchema = z.object({
  summary: z.string(),
  problem: z.string(),
  idealCustomer: z.string(),
  demand: z.string(),
  marketSize: z.object({ tam: z.string(), sam: z.string(), som: z.string(), assumptions: z.string() }),
  competitors: z.array(z.object({ name: z.string(), type: z.enum(['Direct', 'Indirect', 'Alternative']), notes: z.string(), verified: z.boolean() })),
  marketGaps: z.array(z.string()),
  valueProposition: z.string(),
  businessModel: z.string(),
  revenue: z.string(),
  costs: z.string(),
  failureRisks: z.array(z.object({ risk: z.string(), why: z.string(), severity: z.enum(['Low', 'Medium', 'High']), evidence: z.string(), mitigation: z.string() })),
  successStrategies: z.array(z.string()),
  pivots: z.array(z.string()),
  scorecard: z.array(ScoreItemSchema),
  recommendationReason: z.string(),
  verifiedFacts: z.array(z.string()),
  assumptions: z.array(z.string()),
  missingInfo: z.array(z.string()),
  mvp: z.string(),
  sevenDayPlan: z.array(z.string()),
  thirtyDayPlan: z.array(z.string()),
  interviewQuestions: z.array(z.string()),
  experiments: z.array(z.object({ experiment: z.string(), hypothesis: z.string(), audience: z.string(), action: z.string(), expectedEvidence: z.string() })),
  nextSteps: z.array(z.string()),
})

export const SCORE_DIMENSIONS = [
  { key: 'fit', label: 'Problem–Solution Fit', weight: 15 },
  { key: 'demand', label: 'Market Demand', weight: 15 },
  { key: 'customer', label: 'Target Customer Clarity', weight: 10 },
  { key: 'competition', label: 'Competition and Differentiation', weight: 10 },
  { key: 'revenue', label: 'Revenue Model', weight: 10 },
  { key: 'feasibility', label: 'Technical and Operational Feasibility', weight: 10 },
  { key: 'acquisition', label: 'Customer Acquisition', weight: 10 },
  { key: 'risk', label: 'Business and AI Risks', weight: 10 },
  { key: 'readiness', label: 'Founder Readiness and Execution', weight: 10 },
]

export function recommend(total: number): ValidationReport['recommendation'] {
  if (total >= 70) return 'GO'
  if (total >= 50) return 'CONDITIONAL GO'
  return 'NO-GO'
}

function normaliseScorecard(items: z.infer<typeof ScoreItemSchema>[]) {
  return SCORE_DIMENSIONS.map((d) => {
    const found = items.find((i) => i.key === d.key) ?? items.find((i) => i.label.toLowerCase().startsWith(d.label.toLowerCase().slice(0, 8)))
    const score = Math.max(0, Math.min(d.weight, Math.round(found?.score ?? 0)))
    return {
      ...d,
      score,
      reason: found?.reason ?? 'Not assessed.',
      evidence: found?.evidence ?? '',
      missing: found?.missing ?? '',
      improvement: found?.improvement ?? '',
    }
  })
}

export async function validationReport(v: Validation, s: FASession | null): Promise<ValidationReport> {
  if (!aiEnabled()) return mock.validationReport(v, s)
  const ctx = validationContext(v, s)
  const convo = v.messages.map((m) => `${m.role === 'user' ? 'FOUNDER' : 'ADVISOR'}: ${m.content}`).join('\n')
  const prior = v.versions.at(-1)?.report
  const experimentResults = prior?.experiments.filter((e) => e.actualResult)
  const loc = locationLabel(s?.location) || 'the founder\'s market'

  const found = await research(
    'You are a market research analyst. Use web search to find current, reliable information. Report only what sources say, with the source for each fact. If you cannot find something, say "not found". Never estimate in place of a source.',
    `Research this business idea for ${loc}:\n${v.title}\n${v.description}\n\nFind: (1) direct and indirect competitors or alternatives with their pricing/positioning, (2) evidence of demand (search trends, forums, reports), (3) any credible market-size figures with source and year, (4) regulatory or licensing issues. Keep notes concise with the URL after each fact.`,
  )

  const out = await generate({
    system: VALIDATOR_SYSTEM.replace('Keep replies under 180 words, plain text, short paragraphs or "-" bullets. No markdown headings.', 'Return the full structured report.'),
    schema: ReportSchema,
    effort: 'high',
    prompt: `${ctx}

ADVISOR CONVERSATION SO FAR:
${convo || '(none)'}

WEB RESEARCH NOTES (${found.sources.length} sources, researched ${new Date().toISOString().slice(0, 10)}):
${found.notes || 'Research could not be completed. Treat ALL market facts as unverified and say so.'}
${experimentResults?.length ? `\nREAL-WORLD EXPERIMENT RESULTS FROM THE FOUNDER (weigh these above AI assumptions):\n${experimentResults.map((e) => `- ${e.experiment}: ${e.actualResult}`).join('\n')}` : ''}

Write the Business Idea Validation Report.
- verifiedFacts: ONLY facts that appear in the research notes, each ending with its source URL in brackets.
- competitors: verified=true only if the competitor appears in the research notes.
- marketSize: TAM/SAM/SOM only if supported by a sourced figure; otherwise write "Not enough reliable data" and explain how to estimate it.
- Scorecard: one item per dimension using these keys and weights, score 0..weight: ${SCORE_DIMENSIONS.map((d) => `${d.key}=${d.label} (${d.weight})`).join('; ')}. Be strict: missing evidence lowers the score.
- failureRisks: the 4-6 most serious reasons this could fail.
- pivots: how to improve or redirect the idea if weak.
- experiments: 4-6 practical real-world validation experiments (interviews, landing page, waitlist, manual pilot, willingness-to-pay test, pre-orders).
- interviewQuestions: 6-8 non-leading customer interview questions.
- sevenDayPlan: 7 entries (Day 1 … Day 7). thirtyDayPlan: 4 entries (Week 1 … Week 4).
- recommendationReason: explain the overall verdict; it is an AI-assisted preliminary assessment, not proof of demand.`,
  })

  const scorecard = normaliseScorecard(out.scorecard)
  const total = scorecard.reduce((a, b) => a + b.score, 0)
  return {
    ...out,
    scorecard,
    total,
    recommendation: recommend(total),
    experiments: out.experiments.map((e) => ({ ...e, id: uid() })),
    sources: found.sources,
    researchedAt: new Date().toISOString(),
  }
}
