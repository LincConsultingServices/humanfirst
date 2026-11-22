// PDF export used in two places: the browser (Download PDF saves the file to the device)
// and the server (the same PDF is attached to report emails). Real, selectable-text PDFs.
// Uses HumanFirst colours: black header band, gold #D4A017 accents, Helvetica (built in to PDF).
import type { jsPDF as JsPDF } from 'jspdf'
import type { FASession, Validation, ValidationReport } from './types'

type Profile = { fullName?: string; institution?: string; status?: string } | null | undefined

const GOLD: [number, number, number] = [212, 160, 23]
const GOLD_DARK: [number, number, number] = [154, 116, 16]
const INK: [number, number, number] = [17, 17, 17]
const MUTED: [number, number, number] = [110, 110, 110]
const RULE: [number, number, number] = [220, 220, 220]

// Built-in PDF fonts only cover Western European characters. Map common symbols and drop the rest
// (emoji etc.) instead of printing garbled glyphs.
function clean(t: unknown): string {
  return String(t ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/–/g, '-')
    .replace(/—/g, ' - ')
    .replace(/…/g, '...')
    .replace(/[•·]/g, '-')
    .replace(/→/g, '->')
    .replace(/[✓✅]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

const slug = (t: string) => clean(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'report'

class Writer {
  doc: JsPDF
  y = 0
  readonly m = 48
  readonly w: number
  readonly h: number
  constructor(doc: JsPDF, private footer: string) {
    this.doc = doc
    this.w = doc.internal.pageSize.getWidth()
    this.h = doc.internal.pageSize.getHeight()
  }
  get width() {
    return this.w - this.m * 2
  }
  ensure(space: number) {
    if (this.y + space > this.h - 56) {
      this.doc.addPage()
      this.y = this.m
    }
  }
  band(eyebrow: string, title: string, sub?: string) {
    const d = this.doc
    d.setFillColor(0, 0, 0)
    d.rect(0, 0, this.w, 118, 'F')
    d.setFont('helvetica', 'bold')
    d.setFontSize(9)
    d.setTextColor(...GOLD)
    d.text(clean(eyebrow).toUpperCase(), this.m, 40, { charSpace: 1.5 })
    d.setFontSize(24)
    d.setTextColor(255, 255, 255)
    const lines = d.splitTextToSize(clean(title), this.width).slice(0, 2)
    d.text(lines, this.m, 70)
    this.y = 138
    if (sub) this.para(sub, { size: 10, color: MUTED })
  }
  heading(t: string) {
    this.ensure(40)
    this.y += 10
    const d = this.doc
    d.setFont('helvetica', 'bold')
    d.setFontSize(10)
    d.setTextColor(...GOLD_DARK)
    d.text(clean(t).toUpperCase(), this.m, this.y, { charSpace: 1 })
    this.y += 6
    d.setDrawColor(...GOLD)
    d.setLineWidth(1.2)
    d.line(this.m, this.y, this.m + 36, this.y)
    this.y += 14
  }
  para(t: unknown, o: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number; gap?: number } = {}) {
    const text = clean(t)
    if (!text) return
    const d = this.doc
    const size = o.size ?? 10.5
    const lh = size * 1.4
    d.setFont('helvetica', o.bold ? 'bold' : 'normal')
    d.setFontSize(size)
    d.setTextColor(...(o.color ?? INK))
    const x = this.m + (o.indent ?? 0)
    for (const line of d.splitTextToSize(text, this.width - (o.indent ?? 0)) as string[]) {
      this.ensure(lh)
      d.text(line, x, this.y)
      this.y += lh
    }
    this.y += o.gap ?? 4
  }
  kv(k: string, v: unknown) {
    const val = Array.isArray(v) ? v.map(clean).filter(Boolean).join(', ') : clean(v)
    if (!val) return
    this.para(k.toUpperCase(), { size: 7.5, bold: true, color: MUTED, gap: 0 })
    this.para(val, { gap: 6 })
  }
  bullets(items: unknown[], ordered = false) {
    const list = items.map(clean).filter(Boolean)
    if (!list.length) return this.para('None recorded.', { color: MUTED })
    list.forEach((it, i) => {
      const d = this.doc
      this.ensure(15)
      d.setFont('helvetica', 'bold')
      d.setFontSize(10.5)
      d.setTextColor(...GOLD_DARK)
      d.text(ordered ? `${i + 1}.` : '-', this.m + 2, this.y)
      this.para(it, { indent: 16, gap: 2 })
    })
    this.y += 4
  }
  bar(label: string, score: number, max: number) {
    const d = this.doc
    this.ensure(26)
    d.setFont('helvetica', 'normal')
    d.setFontSize(10)
    d.setTextColor(...INK)
    d.text(clean(label), this.m, this.y)
    d.setFont('helvetica', 'bold')
    d.text(`${score}/${max}`, this.m + this.width, this.y, { align: 'right' })
    this.y += 6
    d.setFillColor(235, 235, 235)
    d.rect(this.m, this.y, this.width, 4, 'F')
    d.setFillColor(...GOLD)
    d.rect(this.m, this.y, this.width * Math.max(0, Math.min(1, score / max)), 4, 'F')
    this.y += 14
  }
  rule() {
    this.ensure(12)
    this.doc.setDrawColor(...RULE)
    this.doc.setLineWidth(0.5)
    this.doc.line(this.m, this.y, this.m + this.width, this.y)
    this.y += 12
  }
  link(text: string, url: string) {
    const d = this.doc
    this.ensure(14)
    d.setFont('helvetica', 'normal')
    d.setFontSize(9)
    d.setTextColor(...GOLD_DARK)
    const t = (d.splitTextToSize(clean(text) || url, this.width) as string[])[0]
    d.textWithLink(t, this.m, this.y, { url })
    this.y += 11
    d.setTextColor(...MUTED)
    d.setFontSize(7.5)
    d.text((d.splitTextToSize(url, this.width) as string[])[0], this.m, this.y)
    this.y += 13
  }
  finish(): JsPDF {
    const d = this.doc
    const n = d.getNumberOfPages()
    for (let i = 1; i <= n; i++) {
      d.setPage(i)
      d.setDrawColor(...GOLD)
      d.setLineWidth(0.8)
      d.line(this.m, this.h - 40, this.w - this.m, this.h - 40)
      d.setFont('helvetica', 'normal')
      d.setFontSize(8)
      d.setTextColor(...MUTED)
      d.text(clean(this.footer), this.m, this.h - 26)
      d.text(`Page ${i} of ${n}`, this.w - this.m, this.h - 26, { align: 'right' })
    }
    return d
  }
}

async function newWriter(footer: string, title: string) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  doc.setProperties({ title: clean(title), author: 'HumanFirst by KK', creator: 'humanfirstbykk.com' })
  return new Writer(doc, footer)
}

const DISCLAIMER =
  'This score is an AI-assisted preliminary assessment, not proof of market demand or a guarantee of commercial success. Verified facts come from the listed sources; everything else is an estimate or assumption to test with real customers.'

async function renderValidationPdf(v: Validation, versionNumber?: number | null) {
  const version = versionNumber ? v.versions.find((x) => x.version === versionNumber) : v.versions.at(-1)
  if (!version) throw new Error('This idea has no validation report yet.')
  const r: ValidationReport = version.report
  const w = await newWriter('humanfirstbykk.com  -  Business Idea Validation Report', `Validation Report - ${version.title}`)

  w.band('HumanFirst - Business Idea Validation Report', version.title)
  w.para(version.description, { color: MUTED })
  w.para(`Version ${version.version} - ${new Date(version.at).toLocaleDateString()}${v.aiMode === 'demo' ? ' - Demo mode' : ''}`, { size: 8.5, color: MUTED, gap: 10 })

  // Score box
  w.ensure(110)
  const d = w.doc
  const top = w.y
  d.setDrawColor(...GOLD)
  d.setLineWidth(1.2)
  d.roundedRect(w.m, top, w.width, 74, 6, 6, 'S')
  d.setFont('helvetica', 'bold')
  d.setFontSize(8)
  d.setTextColor(...MUTED)
  d.text('BUSINESS IDEA SCORE', w.m + 16, top + 20, { charSpace: 1 })
  d.setFontSize(34)
  d.setTextColor(...INK)
  d.text(String(r.total), w.m + 16, top + 56)
  const sw = d.getTextWidth(String(r.total))
  d.setFontSize(14)
  d.setTextColor(...MUTED)
  d.text('/100', w.m + 20 + sw, top + 56)
  const rec = r.recommendation
  d.setFontSize(13)
  const rw = d.getTextWidth(rec) + 28
  const rx = w.m + w.width - rw - 16
  if (rec === 'GO') {
    d.setFillColor(...GOLD)
    d.roundedRect(rx, top + 26, rw, 28, 3, 3, 'F')
    d.setTextColor(0, 0, 0)
  } else {
    d.setDrawColor(...(rec === 'NO-GO' ? ([255, 107, 53] as [number, number, number]) : GOLD))
    d.setLineWidth(1.5)
    d.roundedRect(rx, top + 26, rw, 28, 3, 3, 'S')
    d.setTextColor(...(rec === 'NO-GO' ? ([200, 70, 20] as [number, number, number]) : GOLD_DARK))
  }
  d.text(rec, rx + 14, top + 45)
  w.y = top + 92
  w.para(r.recommendationReason)
  w.para(DISCLAIMER, { size: 8, color: MUTED, gap: 8 })

  w.heading('100-point scorecard')
  for (const s of r.scorecard) {
    w.bar(s.label, s.score, s.weight)
    w.para(`Why: ${s.reason}`, { size: 8.5, color: MUTED, gap: 0 })
    if (s.improvement) w.para(`Improve: ${s.improvement}`, { size: 8.5, color: MUTED, gap: 8 })
  }

  w.heading('Idea summary & problem')
  w.para(r.summary)
  w.kv('Problem being solved', r.problem)
  w.kv('Ideal customer', r.idealCustomer)
  w.kv('Unique value proposition', r.valueProposition)

  w.heading('Market demand & size')
  w.para(r.demand)
  w.kv('TAM', r.marketSize.tam)
  w.kv('SAM', r.marketSize.sam)
  w.kv('SOM', r.marketSize.som)
  w.kv('Assumptions', r.marketSize.assumptions)
  w.para('Market gaps', { bold: true, gap: 2 })
  w.bullets(r.marketGaps)

  w.heading(`Competitor landscape (${r.competitors.length})`)
  for (const c of r.competitors) {
    w.para(`${c.name}  (${c.type}${c.verified ? ', found in research' : ', unverified'})`, { bold: true, gap: 0 })
    w.para(c.notes, { gap: 6 })
  }

  w.heading('Business model, revenue & costs')
  w.kv('Recommended model', r.businessModel)
  w.kv('Revenue', r.revenue)
  w.kv('Costs & feasibility', r.costs)

  w.heading('Why this business could fail')
  for (const f of r.failureRisks) {
    w.para(`${f.risk}  -  ${f.severity} severity`, { bold: true, gap: 0 })
    w.para(`Why: ${f.why}`, { size: 9.5, gap: 0 })
    w.para(`Evidence: ${f.evidence}`, { size: 9.5, gap: 0 })
    w.para(`Reduce or test it: ${f.mitigation}`, { size: 9.5, gap: 8 })
  }

  w.heading('How this business could succeed')
  w.bullets(r.successStrategies)
  w.para('Pivots to consider', { bold: true, gap: 2 })
  w.bullets(r.pivots)

  w.heading('Verified facts vs assumptions')
  w.para('Verified facts (from sources)', { bold: true, gap: 2 })
  w.bullets(r.verifiedFacts)
  w.para('Assumptions to test', { bold: true, gap: 2 })
  w.bullets(r.assumptions)
  w.para('Missing information', { bold: true, gap: 2 })
  w.bullets(r.missingInfo)

  w.heading('MVP & action plans')
  w.kv('Recommended MVP', r.mvp)
  w.para('7-day validation plan', { bold: true, gap: 2 })
  w.bullets(r.sevenDayPlan)
  w.para('30-day action plan', { bold: true, gap: 2 })
  w.bullets(r.thirtyDayPlan)
  w.para('Recommended next steps', { bold: true, gap: 2 })
  w.bullets(r.nextSteps, true)

  w.heading('Customer interview questions')
  w.bullets(r.interviewQuestions, true)

  w.heading('Real-world validation experiments')
  for (const e of r.experiments) {
    w.para(e.experiment, { bold: true, gap: 0 })
    w.para(`Hypothesis: ${e.hypothesis}`, { size: 9.5, gap: 0 })
    w.para(`Action: ${e.action}  |  Expected evidence: ${e.expectedEvidence}`, { size: 9.5, gap: 0 })
    if (e.actualResult) w.para(`Result: ${e.actualResult}${e.meaning ? `  |  Meaning: ${e.meaning}` : ''}${e.nextAction ? `  |  Next: ${e.nextAction}` : ''}`, { size: 9.5, color: GOLD_DARK, gap: 0 })
    w.y += 6
  }

  w.heading(`Sources (${r.sources.length})`)
  if (r.sources.length) for (const s of r.sources) w.link(s.title, s.url)
  else w.para('No live sources were used for this version, so all market statements are unverified.', { color: MUTED })
  w.para(`Researched ${new Date(r.researchedAt).toLocaleString()}.`, { size: 8, color: MUTED })

  w.rule()
  w.para('Next step: pressure-test your idea in the War Room - enterthewarroom.humanfirstbykk.com', { bold: true })

  return { doc: w.finish(), filename: `humanfirst-validation-${slug(version.title)}-v${version.version}.pdf` }
}

async function renderMapPdf(s: FASession, profile: Profile) {
  if (!s.map) throw new Error('Generate your Career Accelerator Map first.')
  const idea = s.ideas.find((i) => i.id === s.topIdeas[0])
  const job = s.jobs.find((j) => j.id === s.topJobs[0])
  const gap = s.gaps.find((g) => g.id === s.selectedGaps[0])
  const m = s.map
  const w = await newWriter('humanfirstbykk.com  -  Phase 1 - Future Accelerator 2.0', 'My Career Accelerator Map')

  w.band('HumanFirst Future Accelerator', 'My Career Accelerator Map')
  w.para(`Generated ${new Date(m.generatedAt).toLocaleDateString()}${s.aiMode === 'demo' ? ' - Demo mode' : ''}`, { size: 8.5, color: MUTED, gap: 8 })

  w.heading('My profile')
  w.kv('Name', profile?.fullName)
  w.kv('Institution / Company', profile?.institution)
  w.kv('Location', s.location ? [s.location.city, s.location.state, s.location.country].filter(Boolean).join(', ') : '')
  w.kv('Status', profile?.status)
  w.kv('Strengths', m.strengths)

  w.heading('My unfair advantage')
  w.para(s.unfairAdvantage?.statement, { size: 12, bold: true })
  w.heading('The pain only I can see')
  w.para(gap?.problem)

  if (idea) {
    w.heading('Founder path - #1 business idea')
    w.para(idea.idea, { size: 13, bold: true, gap: 6 })
    w.kv('Solution only I can build', idea.solution)
    w.kv('Target audience', idea.audience)
    w.kv('AI disruption risk', idea.risk)
    w.kv('Business keywords', idea.keywords)
    w.kv('First step with $0 this week', idea.firstStep)
  }
  if (job) {
    w.heading('Hired path - #1 job title')
    w.para(`${job.title}${job.emerging ? ' (Emerging)' : ''}`, { size: 13, bold: true, gap: 6 })
    w.kv('Solution only I can bring', job.solution)
    w.kv('Target companies (suggested, not vacancies)', job.targetCompanies)
    w.kv('AI disruption risk', job.risk)
    w.kv('Resume keywords', job.keywords)
    w.kv('First step to build my portfolio this week', job.portfolioStep)
  }

  w.heading('My next 3 actions')
  w.kv('1. This week', m.nextActions.thisWeek)
  w.kv('2. In 14 days', m.nextActions.in14Days)
  w.kv('3. In 30 days', m.nextActions.in30Days)

  w.heading('My pitch')
  w.para(`"Because I have ${m.pitch.advantage}..."`)
  w.para(`"I see a problem most people miss: ${m.pitch.problem}."`)
  w.para(`"My solution is ${m.pitch.solution}."`)

  const top = s.topIdeas.map((id) => s.ideas.find((i) => i.id === id)).filter(Boolean)
  const jobs = s.topJobs.map((id) => s.jobs.find((j) => j.id === id)).filter(Boolean)
  if (top.length) {
    w.heading(`My top ${top.length} business ideas`)
    w.bullets(top.map((i) => `${i!.idea} (${i!.risk} risk)`), true)
  }
  if (jobs.length) {
    w.heading(`My top ${jobs.length} job titles`)
    w.bullets(jobs.map((j) => `${j!.title} (${j!.risk} risk)`), true)
  }

  w.rule()
  w.para('AI-assisted results. Target companies are suggestions, not verified vacancies. Market problems and willingness to pay are hypotheses to test. No job or business is completely AI-proof.', { size: 8, color: MUTED })

  return { doc: w.finish(), filename: `humanfirst-career-accelerator-map${profile?.fullName ? `-${slug(profile.fullName)}` : ''}.pdf` }
}

// ---- browser: save the file to the device
export async function downloadValidationPdf(v: Validation, versionNumber?: number | null) {
  const { doc, filename } = await renderValidationPdf(v, versionNumber)
  doc.save(filename)
}

export async function downloadMapPdf(s: FASession, profile: Profile) {
  const { doc, filename } = await renderMapPdf(s, profile)
  doc.save(filename)
}

// ---- server: bytes for email attachments
export async function validationPdfBytes(v: Validation, versionNumber?: number | null) {
  const { doc, filename } = await renderValidationPdf(v, versionNumber)
  return { bytes: new Uint8Array(doc.output('arraybuffer')), filename }
}

export async function mapPdfBytes(s: FASession, profile: Profile) {
  const { doc, filename } = await renderMapPdf(s, profile)
  return { bytes: new Uint8Array(doc.output('arraybuffer')), filename }
}
