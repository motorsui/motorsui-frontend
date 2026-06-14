import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { chartId: string; answers: Record<string, string> }
  const { chartId, answers } = body
  if (!chartId || !answers) return NextResponse.json({ error: 'chartId and answers required' }, { status: 400 })

  const adminSupa = createAdminClient()
  const { data: chart, error: chartError } = await adminSupa.from('charts').select('id, user_id').eq('id', chartId).single()
  if (chartError || !chart || chart.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await adminSupa.from('charts').update({ intake_parenting: answers }).eq('id', chartId)
  if (error) return NextResponse.json({ error: 'Save failed' }, { status: 500 })

  return NextResponse.json({ success: true })
}
