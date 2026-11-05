import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { PARENTING_QUESTIONNAIRE_VERSION, parentingIntakeVersion, toParentingSubmission } from '@/lib/intake-questions'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { chartId: string; answers: Record<string, string> }
  const { chartId, answers } = body
  if (!chartId || !answers) return NextResponse.json({ error: 'chartId and answers required' }, { status: 400 })

  const adminSupa = createAdminClient()
  const { data: chart, error: chartError } = await adminSupa
    .from('charts').select('id, user_id, intake_parenting, intake_parenting_complete').eq('id', chartId).single()
  if (chartError || !chart || chart.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // A submitted intake belongs to its child and its version; autosave never replaces it.
  if (chart.intake_parenting_complete === true) return NextResponse.json({ error: 'Intake already submitted' }, { status: 409 })
  const storedVersion = parentingIntakeVersion(chart.intake_parenting)
  if (storedVersion && storedVersion !== PARENTING_QUESTIONNAIRE_VERSION) {
    return NextResponse.json({ error: 'Intake was started on an earlier questionnaire version' }, { status: 409 })
  }

  const { error } = await adminSupa.from('charts').update({ intake_parenting: toParentingSubmission(answers) }).eq('id', chartId)
  if (error) return NextResponse.json({ error: 'Save failed' }, { status: 500 })

  return NextResponse.json({ success: true })
}
