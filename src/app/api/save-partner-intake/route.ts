import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Reached from the share link (/intake/partner?id=), so the partner is not
// signed in. The form autosaves after each question; writes are accepted only
// for a partner chart whose intake is not yet complete, and the final submit
// (complete: true) locks it. Answers must be a small object of strings.

const MAX_ANSWERS      = 60
const MAX_ANSWER_CHARS = 4000

function validAnswers(answers: unknown): answers is Record<string, string> {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return false
  const entries = Object.entries(answers)
  return entries.length > 0 && entries.length <= MAX_ANSWERS &&
    entries.every(([k, v]) => k.length <= 100 && typeof v === 'string' && v.length <= MAX_ANSWER_CHARS)
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { partner_chart_id?: unknown; answers?: unknown; complete?: unknown }
  const { partner_chart_id, answers } = body
  const complete = body.complete === true
  if (typeof partner_chart_id !== 'string' || !partner_chart_id) return NextResponse.json({ error: 'partner_chart_id and answers required' }, { status: 400 })
  if (!validAnswers(answers)) return NextResponse.json({ error: 'Invalid answers' }, { status: 400 })

  const adminSupa = createAdminClient()
  const { data: chart, error: chartError } = await adminSupa.from('charts').select('id, chart_label, intake_relational_complete').eq('id', partner_chart_id).maybeSingle()
  if (chartError || !chart || chart.chart_label !== 'partner') return NextResponse.json({ error: 'Partner chart not found' }, { status: 404 })
  if (chart.intake_relational_complete === true) return NextResponse.json({ error: 'Intake already submitted' }, { status: 409 })

  const { data: updated, error } = await adminSupa.from('charts').update({ intake_relational: answers, ...(complete ? { intake_relational_complete: true } : {}) })
    .eq('id', partner_chart_id).or('intake_relational_complete.is.null,intake_relational_complete.eq.false').select('id')
  if (error) return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  if (!updated?.length) return NextResponse.json({ error: 'Intake already submitted' }, { status: 409 })

  return NextResponse.json({ success: true })
}
