import { NextRequest, NextResponse } from 'next/server'
import { get } from '@/lib/fa/store'

export const dynamic = 'force-dynamic'

// Read-only summary the War Room can fetch with ?hf_ref=<ref>:
//   p_…  the visitor's chosen idea and their 3-line pitch (from the Future Accelerator results)
//   v_…  a Business Idea Validation report summary
// No name, email or survey answers are included.
const ORIGIN = 'https://enterthewarroom.humanfirstbykk.com'
const cors = { 'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Methods': 'GET, OPTIONS', Vary: 'Origin' }

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params
  const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404, headers: cors })

  if (ref.startsWith('p_')) {
    const p = await get('pitches', ref)
    if (!p) return notFound()
    return NextResponse.json(
      {
        ref: p.id,
        type: 'pitch',
        idea: p.idea,
        pitch: {
          because: `Because I have ${p.pitch.advantage}`,
          problem: `I see a problem most people miss: ${p.pitch.problem}`,
          solution: `My solution is: ${p.pitch.solution}`,
        },
        updatedAt: p.updatedAt,
        source: 'humanfirst-future-accelerator',
      },
      { headers: cors },
    )
  }

  const v = await get('validations', ref)
  const last = v?.versions.at(-1)
  if (!v || !last) return notFound()
  const r = last.report
  return NextResponse.json(
    {
      ref: v.id,
      type: 'validation',
      idea: { title: last.title, description: last.description },
      validation: {
        score: r.total,
        recommendation: r.recommendation,
        summary: r.recommendationReason,
        keyRisks: r.failureRisks.slice(0, 5).map((f) => ({ risk: f.risk, severity: f.severity })),
        nextSteps: r.nextSteps,
        mvp: r.mvp,
        assessedAt: last.at,
      },
      source: 'humanfirst-future-accelerator',
    },
    { headers: cors },
  )
}
