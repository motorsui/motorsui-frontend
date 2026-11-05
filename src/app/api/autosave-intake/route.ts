import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { RELATIONAL_QUESTIONNAIRE_VERSION, relationalIntakeVersion, toRelationalSubmission } from '@/lib/intake-questions'
import { lovingByDesignClosed } from '@/lib/product-availability'

export async function POST(request: NextRequest) {
  const closed = lovingByDesignClosed()
  if (closed) return closed
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { chartId: string; answers: Record<string, string> }
  const { chartId, answers } = body
  if (!chartId || !answers) return NextResponse.json({ error: 'chartId and answers required' }, { status: 400 })

  const adminSupa = createAdminClient()
  const { data: chart, error: chartError } = await adminSupa
    .from('charts').select('id, user_id, chart_label, intake_relational, intake_relational_complete').eq('id', chartId).single()
  // Partner and child rows are owned by the purchaser too; a partner's answers
  // are written only through their own share link (api/partner-intake).
  if (chartError || !chart || chart.user_id !== user.id || chart.chart_label === 'partner' || chart.chart_label === 'child') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // A submitted intake belongs to its version; autosave never replaces it.
  if (chart.intake_relational_complete === true) return NextResponse.json({ error: 'Intake already submitted' }, { status: 409 })
  const storedVersion = relationalIntakeVersion(chart.intake_relational)
  if (storedVersion && storedVersion !== RELATIONAL_QUESTIONNAIRE_VERSION) {
    return NextResponse.json({ error: 'Intake was started on an earlier questionnaire version' }, { status: 409 })
  }

  const { error } = await adminSupa.from('charts').update({ intake_relational: toRelationalSubmission(answers, true) }).eq('id', chartId)
  if (error) return NextResponse.json({ error: 'Save failed' }, { status: 500 })

  return NextResponse.json({ success: true })
}
