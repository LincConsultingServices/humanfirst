// Demo-mode outputs used when no ANTHROPIC_API_KEY is configured. They are built from the
// visitor's own taps so the whole journey can be tested end to end, and the UI labels
// them as demo content. They are NOT AI analysis.
import { locationLabel, riskFromEdge } from './quick'
import type { HumanEdge, Idea, Job, QuickProfile, Validation, ValidationReport, FASession } from './types'

const uid = () => Math.random().toString(36).slice(2, 10)
const edge = (a: number, b: number, c: number, d: number, e: number): HumanEdge => ({ trust: a, presence: b, judgment: c, local: d, relationships: e })

type T = { idea: string; oneLiner: string; problem: string; audience: string; solution: string; firstStep: string; keywords: string[]; edge: HumanEdge }
type R = { title: string; emerging?: boolean; oneLiner: string; keywords: string[]; portfolioStep: string; edge: HumanEdge }

const BY_SKILL: Record<string, { idea: T; role: R }> = {
  Coding: {
    idea: { idea: 'Websites for local shops', oneLiner: 'Simple websites and booking pages for small local businesses.', problem: 'Local shops lose customers because they cannot be found or booked online.', audience: 'Owner-run shops and salons', solution: 'I build and look after a simple website with online booking for a fixed monthly fee.', firstStep: 'Offer a free one-page site to two shops you already visit.', keywords: ['web design', 'small business', 'online booking'], edge: edge(2, 1, 1, 2, 2) },
    role: { title: 'Junior Web Developer', oneLiner: 'Build and maintain websites and web apps.', keywords: ['JavaScript', 'React', 'HTML/CSS'], portfolioStep: 'Rebuild a local business website and publish it on GitHub.', edge: edge(1, 0, 1, 1, 1) },
  },
  Teaching: {
    idea: { idea: 'After-school skills club', oneLiner: 'Small weekend classes that teach a practical skill.', problem: 'Parents want practical skills for their children that school does not cover.', audience: 'Parents of 10 to 16 year olds', solution: 'I run small weekend classes with a clear project at the end of each month.', firstStep: 'Run one free trial class for five children from your network.', keywords: ['tutoring', 'education', 'kids classes'], edge: edge(2, 2, 1, 2, 2) },
    role: { title: 'Learning & Development Coordinator', oneLiner: 'Plan and run training for employees.', keywords: ['training design', 'facilitation', 'LMS'], portfolioStep: 'Record a 5-minute lesson on a topic you know well.', edge: edge(2, 2, 2, 1, 2) },
  },
  Sales: {
    idea: { idea: 'Sales help for new sellers', oneLiner: 'Hands-on sales coaching for people starting a small business.', problem: 'New sellers have a good product but struggle to close their first customers.', audience: 'First-time founders and home sellers', solution: 'I sit with sellers on real calls and fix their pitch in two weeks.', firstStep: 'Coach one friend through their next three sales conversations.', keywords: ['sales coaching', 'small business'], edge: edge(2, 1, 2, 1, 2) },
    role: { title: 'Business Development Executive', oneLiner: 'Find and win new clients.', keywords: ['lead generation', 'negotiation', 'CRM'], portfolioStep: 'Write a short case study of a deal you helped close.', edge: edge(2, 1, 2, 1, 2) },
  },
  'Marketing & social media': {
    idea: { idea: 'Social media for local brands', oneLiner: 'Monthly content and posting for small local brands.', problem: 'Small brands know they should post but have no time or plan.', audience: 'Cafés, boutiques and clinics', solution: 'I plan, shoot and post a month of content for a fixed fee.', firstStep: 'Make a free one-week content plan for one local brand.', keywords: ['social media', 'content', 'local marketing'], edge: edge(1, 1, 1, 2, 1) },
    role: { title: 'Social Media Executive', oneLiner: 'Plan and run a brand\'s social channels.', keywords: ['content calendar', 'analytics', 'Instagram'], portfolioStep: 'Grow a page you run for 30 days and document the results.', edge: edge(1, 0, 1, 1, 1) },
  },
  Design: {
    idea: { idea: 'Brand kits for new businesses', oneLiner: 'Logo, colours and templates in one week.', problem: 'New businesses look unprofessional because they have no consistent brand.', audience: 'New small businesses', solution: 'I deliver a ready-to-use brand kit in a week for a fixed price.', firstStep: 'Redesign one friend\'s business logo and ask for a testimonial.', keywords: ['branding', 'graphic design'], edge: edge(1, 0, 2, 1, 1) },
    role: { title: 'UI/UX Designer', oneLiner: 'Design screens people find easy to use.', keywords: ['Figma', 'user research', 'prototyping'], portfolioStep: 'Redesign one app screen you find confusing and explain why.', edge: edge(1, 0, 2, 0, 1) },
  },
  'Accounts / GST': {
    idea: { idea: 'GST clinic for home businesses', oneLiner: 'Monthly GST and bookkeeping help for small sellers.', problem: 'Home businesses get fined for filing mistakes they do not understand.', audience: 'Home businesses and freelancers', solution: 'I do a monthly done-with-you GST check at a small fixed fee.', firstStep: 'Offer three free GST reviews in a local WhatsApp group.', keywords: ['GST', 'bookkeeping', 'compliance'], edge: edge(2, 1, 2, 2, 2) },
    role: { title: 'Accounts Executive', oneLiner: 'Handle bookkeeping, GST and reconciliations.', keywords: ['GST filing', 'Tally', 'reconciliation'], portfolioStep: 'Prepare a sample GST return walkthrough and share it.', edge: edge(1, 1, 2, 2, 1) },
  },
  Operations: {
    idea: { idea: 'Operations setup for small teams', oneLiner: 'Simple systems that stop small teams dropping the ball.', problem: 'Growing small businesses lose orders and time to messy processes.', audience: 'Businesses with 3 to 20 staff', solution: 'I map their process and set up simple tools in two weeks.', firstStep: 'Map one local business\'s order process for free.', keywords: ['process improvement', 'operations'], edge: edge(2, 2, 2, 1, 2) },
    role: { title: 'Operations Coordinator', oneLiner: 'Keep day-to-day work running smoothly.', keywords: ['process', 'scheduling', 'vendor management'], portfolioStep: 'Write a one-page process improvement you made.', edge: edge(1, 2, 2, 1, 1) },
  },
  'Customer service': {
    idea: { idea: 'Customer care for online sellers', oneLiner: 'Part-time customer support for small online shops.', problem: 'Small online sellers lose repeat customers because replies are slow.', audience: 'Small online shops', solution: 'I handle their customer messages daily for a monthly fee.', firstStep: 'Offer one seller a free week of message handling.', keywords: ['customer support', 'e-commerce'], edge: edge(2, 0, 1, 1, 2) },
    role: { title: 'Customer Success Associate', oneLiner: 'Help customers get value and stay.', keywords: ['customer success', 'retention', 'CRM'], portfolioStep: 'Write how you turned around one unhappy customer.', edge: edge(2, 1, 2, 1, 2) },
  },
  Writing: {
    idea: { idea: 'Website words for professionals', oneLiner: 'Clear website and profile writing for professionals.', problem: 'Doctors, lawyers and coaches lose clients because their profiles are unclear.', audience: 'Independent professionals', solution: 'I rewrite their website and profiles so clients understand them.', firstStep: 'Rewrite one professional\'s LinkedIn summary for free.', keywords: ['copywriting', 'content'], edge: edge(1, 0, 2, 1, 1) },
    role: { title: 'Content Writer', oneLiner: 'Write clear content for websites and campaigns.', keywords: ['copywriting', 'SEO', 'editing'], portfolioStep: 'Publish three short articles in your area of interest.', edge: edge(1, 0, 1, 0, 1) },
  },
  'Data & analysis': {
    idea: { idea: 'Sales dashboards for small shops', oneLiner: 'A simple weekly view of what sells and what does not.', problem: 'Small shop owners guess what to stock because they cannot read their numbers.', audience: 'Retail and food businesses', solution: 'I set up a simple dashboard and review it with them monthly.', firstStep: 'Analyse one shop\'s last month of sales for free.', keywords: ['dashboards', 'analytics'], edge: edge(1, 0, 2, 1, 1) },
    role: { title: 'Data Analyst', oneLiner: 'Turn data into decisions.', keywords: ['Excel', 'SQL', 'Power BI'], portfolioStep: 'Publish one analysis of a public dataset with clear findings.', edge: edge(1, 0, 2, 0, 1) },
  },
  Cooking: {
    idea: { idea: 'Home meal plans for busy families', oneLiner: 'Weekly healthy home-cooked meal plans and prep.', problem: 'Busy families eat takeaway because planning healthy meals takes time.', audience: 'Working parents', solution: 'I plan and prep a week of healthy family meals.', firstStep: 'Cook a trial week for one family you know.', keywords: ['meal prep', 'home food'], edge: edge(2, 2, 1, 2, 2) },
    role: { title: 'Kitchen Supervisor', oneLiner: 'Run a kitchen team and quality.', keywords: ['food safety', 'menu planning'], portfolioStep: 'Document three recipes with costs per plate.', edge: edge(1, 2, 2, 1, 1) },
  },
  'Healthcare & care': {
    idea: { idea: 'Care coordination for elderly parents', oneLiner: 'Help families organise care for ageing parents.', problem: 'Families working away struggle to organise care for elderly parents.', audience: 'Adult children living away', solution: 'I coordinate appointments, medicines and visits for a monthly fee.', firstStep: 'Help one family set up a simple care plan.', keywords: ['elder care', 'care coordination'], edge: edge(2, 2, 2, 2, 2) },
    role: { title: 'Patient Care Coordinator', oneLiner: 'Coordinate patient appointments and support.', keywords: ['patient care', 'scheduling'], portfolioStep: 'Write a short guide that helps patients prepare for visits.', edge: edge(2, 2, 2, 1, 2) },
  },
  'Repairs & hands-on': {
    idea: { idea: 'Trusted home repair service', oneLiner: 'Small home repairs done properly and on time.', problem: 'Households struggle to find reliable people for small repairs.', audience: 'Busy households', solution: 'I offer fixed-price small repairs booked on WhatsApp.', firstStep: 'Do three small repairs for neighbours and collect reviews.', keywords: ['home services', 'repairs'], edge: edge(2, 2, 1, 2, 2) },
    role: { title: 'Field Service Technician', oneLiner: 'Install and repair equipment on site.', keywords: ['troubleshooting', 'installation'], portfolioStep: 'Photograph and describe five repairs you have done.', edge: edge(2, 2, 2, 1, 1) },
  },
  'Managing people': {
    idea: { idea: 'Team-lead coaching for first managers', oneLiner: 'Practical coaching for people managing a team for the first time.', problem: 'New managers struggle and teams lose good people.', audience: 'Small companies promoting from within', solution: 'I coach new managers through their first 90 days.', firstStep: 'Coach one new manager for free for a month.', keywords: ['leadership', 'coaching'], edge: edge(2, 1, 2, 1, 2) },
    role: { title: 'Team Lead', oneLiner: 'Lead a small team to deliver results.', keywords: ['people management', 'planning'], portfolioStep: 'Write how you led a team through one hard week.', edge: edge(2, 1, 2, 1, 2) },
  },
}

// Which skill template best matches each interest (used when fewer than 3 skills are picked).
const SKILL_FOR_INTEREST: Record<string, string[]> = {
  Technology: ['Coding', 'Data & analysis'], Education: ['Teaching'], 'Health & wellbeing': ['Healthcare & care'], Food: ['Cooking'],
  'Finance & money': ['Accounts / GST', 'Data & analysis'], 'Creative & media': ['Design', 'Marketing & social media', 'Writing'],
  'Sports & fitness': ['Teaching'], 'Fashion & beauty': ['Marketing & social media', 'Design'], Travel: ['Customer service'],
  Environment: ['Operations'], Community: ['Managing people', 'Teaching'], 'Retail & shopping': ['Sales', 'Customer service'],
}

export function quick(q: QuickProfile, exclude: string[] = []) {
  const where = locationLabel(q.location)
  const fromInterests = q.interests.flatMap((i) => SKILL_FOR_INTEREST[i] ?? [])
  const pool = [...q.skills, ...fromInterests, ...Object.keys(BY_SKILL)].filter((s, i, a) => a.indexOf(s) === i && BY_SKILL[s])
  const picked = pool.filter((s) => !exclude.includes(BY_SKILL[s].idea.idea)).slice(0, 3)
  const ideas: Idea[] = picked.map((s) => {
    const t = BY_SKILL[s].idea
    return {
      id: uid(), idea: t.idea, description: t.oneLiner, problem: t.problem, audience: where ? `${t.audience} in ${where}` : t.audience,
      solution: t.solution,
      whyYou: q.skills.includes(s)
        ? `It uses your ${s} skills, and people already come to you for ${q.helps[0]?.toLowerCase() ?? 'help'}.`
        : `It builds on your interest in ${q.interests[0]?.toLowerCase() ?? 'this area'} and your ${q.skills[0] ?? ''} skills.`,
      risk: riskFromEdge(t.edge), keywords: t.keywords, firstStep: t.firstStep, humanEdge: t.edge, origin: 'generated',
    }
  })
  // Every journey ends with a pitch in the War Room, so no job roles are generated.
  const jobs: Job[] = []
  return {
    edge: `You combine ${q.skills.slice(0, 2).join(' and ')} skills with a real interest in ${q.interests[0]?.toLowerCase() ?? 'people'}, so people trust you with ${q.helps[0]?.toLowerCase() ?? 'their problems'}.`,
    strengths: [...q.skills.slice(0, 2), q.helps[0] ?? 'Helping others'].slice(0, 3),
    pitchAdvantage: `${q.skills.slice(0, 2).join(' and ')} skills, and people already come to me for ${q.helps[0]?.toLowerCase() ?? 'help'}`,
    ideas,
    jobs,
    nextActions: {
      thisWeek: ideas[0]?.firstStep ?? 'Talk to five people who have this problem.',
      in14Days: `Run a small paid pilot of "${ideas[0]?.idea ?? 'your idea'}" with two or three customers.`,
      in30Days: 'Decide to grow, change or stop, and pitch it in the War Room.',
    },
  }
}

export function advisorReply(v: Validation) {
  const n = v.messages.filter((m) => m.role === 'user').length
  const qs = [
    `Thanks. Let's test "${v.title}". First: who exactly has this problem, and how are they solving it today?`,
    'Who would actually pay — the person with the problem, or someone else (a parent, employer, institution)? What would they pay today for the current alternative?',
    'Where do you want to launch first, and is this local, regional or national?',
    'What skills, experience or connections do you already have that make this easier for you than for anyone else?',
    'Good — I have enough for a first assessment. Click "Generate validation report" when you are ready. (Demo mode: add an AI key for real analysis and web research.)',
  ]
  return qs[Math.min(n - 1, qs.length - 1)] ?? qs[0]
}

export function validationReport(v: Validation, s: FASession | null): ValidationReport {
  const dims = [
    ['fit', 'Problem–Solution Fit', 15, 10], ['demand', 'Market Demand', 15, 8], ['customer', 'Target Customer Clarity', 10, 6],
    ['competition', 'Competition and Differentiation', 10, 5], ['revenue', 'Revenue Model', 10, 6], ['feasibility', 'Technical and Operational Feasibility', 10, 8],
    ['acquisition', 'Customer Acquisition', 10, 5], ['risk', 'Business and AI Risks', 10, 6], ['readiness', 'Founder Readiness and Execution', 10, 7],
  ] as const
  const tested = v.versions.at(-1)?.report.experiments.filter((e) => e.actualResult).length ?? 0
  const scorecard = dims.map(([key, label, weight, score]) => ({
    key, label, weight, score: Math.min(weight, score + (key === 'demand' ? tested * 2 : 0)),
    reason: 'Demo assessment based only on the information provided.', evidence: tested ? `${tested} real-world experiment result(s) recorded.` : 'No external evidence yet.',
    missing: 'Customer conversations and real pricing signals.', improvement: 'Run the experiments below and re-assess.',
  }))
  const total = scorecard.reduce((a, b) => a + b.score, 0)
  return {
    summary: `${v.title}: ${v.description}`,
    problem: v.description,
    idealCustomer: s?.location ? `Early adopters in ${s.location.city} who feel this problem weekly.` : 'Early adopters who feel this problem weekly.',
    demand: 'Not yet evidenced. Demo mode does not perform web research.',
    marketSize: { tam: 'Not enough reliable data', sam: 'Not enough reliable data', som: 'Not enough reliable data', assumptions: 'Estimate bottom-up: number of reachable customers × realistic price × purchase frequency.' },
    competitors: [{ name: 'Doing nothing / DIY', type: 'Alternative', notes: 'The most common competitor for new ideas.', verified: false }],
    marketGaps: ['A more personal, experience-led version of existing options.'],
    valueProposition: 'Human-first help from someone who has been there.',
    businessModel: 'Service-based to start (sessions or packages), productise later.',
    revenue: 'Assumption: per-session or monthly package pricing. Validate willingness to pay before setting prices.',
    costs: 'Low: your time, free tools, small marketing spend.',
    failureRisks: [
      { risk: 'No genuine demand', why: 'People may like the idea but not pay.', severity: 'High', evidence: 'No pre-orders yet.', mitigation: 'Ask for a deposit or pre-order early.' },
      { risk: 'Hard to reach customers', why: 'No existing audience or channel.', severity: 'Medium', evidence: 'Unknown.', mitigation: 'Test 3 channels this week.' },
      { risk: 'Founder time constraints', why: 'Service businesses depend on your hours.', severity: 'Medium', evidence: 'Assumption.', mitigation: 'Limit the pilot to 5 customers.' },
    ],
    successStrategies: ['Start with one narrow customer segment.', 'Deliver manually first, then automate what repeats.', 'Collect testimonials from the first five customers.'],
    pivots: ['Narrow the audience', 'Sell to institutions instead of individuals', 'Offer a smaller paid pilot'],
    scorecard, total,
    recommendation: total >= 70 ? 'GO' : total >= 50 ? 'CONDITIONAL GO' : 'NO-GO',
    recommendationReason: 'Demo assessment: promising direction, but key assumptions (demand, willingness to pay, reach) are untested. This is not AI analysis and not proof of demand.',
    verifiedFacts: [],
    assumptions: ['Customers feel the problem often enough to pay.', 'You can reach them through existing networks.'],
    missingInfo: ['Price customers pay today', 'Number of reachable customers', 'Named competitors'],
    mvp: 'A manual version of the service delivered to 3–5 people over two weeks.',
    sevenDayPlan: ['Day 1: List 20 people who have the problem', 'Day 2: Message 10 of them', 'Day 3: Hold 3 interviews', 'Day 4: Write a one-page offer', 'Day 5: Share a simple landing page', 'Day 6: Ask for pre-orders or deposits', 'Day 7: Review results and decide'],
    thirtyDayPlan: ['Week 1: Customer interviews', 'Week 2: Manual pilot with 3 customers', 'Week 3: Improve the offer from feedback', 'Week 4: First paid customers and decision'],
    interviewQuestions: ['Tell me about the last time this problem happened.', 'What did you do about it?', 'What did that cost you in time or money?', 'What have you tried that did not work?', 'Who else is involved in the decision?', 'What would make a solution worth paying for?'],
    experiments: [
      { id: uid(), experiment: 'Customer interviews', hypothesis: 'At least 5 of 10 people describe this problem as frequent and painful.', audience: 'Target customers', action: 'Hold 10 short interviews', expectedEvidence: '5+ strong pain stories' },
      { id: uid(), experiment: 'Landing page waitlist', hypothesis: '10% of visitors join the waitlist.', audience: 'Online communities', action: 'Publish a one-page offer and share it', expectedEvidence: 'Sign-up rate' },
      { id: uid(), experiment: 'Willingness-to-pay test', hypothesis: '3 people pay a deposit.', audience: 'Interviewees', action: 'Offer a paid pilot', expectedEvidence: 'Deposits received' },
    ],
    nextSteps: ['Run the 7-day plan', 'Record experiment results here', 'Re-assess, then pressure-test in War Room'],
    sources: [],
    researchedAt: new Date().toISOString(),
  }
}
