import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const body = await request.json() as { partner_chart_id: string; answers: Record<string, string> }
  const { partner_chart_id, answers } = body
  if (!partner_chart_id || !answers) return NextResponse.json({ error: 'partner_chart_id and answers required' }, { status: 400 })

  const adminSupa = createAdminClient()
  const { data: chart, error: chartError } = await adminSupa.from('charts').select('id, chart_label').eq('id', partner_chart_id).single()
  if (chartError || !chart || chart.chart_label !== 'partner') return NextResponse.json({ error: 'Partner chart not found' }, { status: 404 })

  const { error } = await adminSupa.from('charts').update({ intake_relational: answers }).eq('id', partner_chart_id)
  if (error) return NextResponse.json({ error: 'Save failed' }, { status: 500 })

  return NextResponse.json({ success: true })
}
