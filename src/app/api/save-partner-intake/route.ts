import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { partnerTokenValid } from '@/lib/partner-intake-token'

// Reached from the share link (/intake/partner?id=&t=), so the partner is not
// signed in. The link token is the credential: its hash must match the
// partner chart's stored hash and be unexpired. The form autosaves after each
// question; writes are accepted only while the intake is not yet complete,
// and the final submit (complete: true) locks it and retires the token.
// Answers must be a small object of strings.

const MAX_ANSWERS      = 60
const MAX_ANSWER_CHARS = 4000

function validAnswers(answers: unknown): answers is Record<string, string> {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return false
  const entries = Object.entries(answers)
  return entries.length > 0 && entries.length <= MAX_ANSWERS &&
    entries.every(([k, v]) => k.length <= 100 && typeof v === 'string' && v.length <= MAX_ANSWER_CHARS)
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { partner_chart_id?: unknown; token?: unknown; answers?: unknown; complete?: unknown }
  const { partner_chart_id, token, answers } = body
  const complete = body.complete === true
  if (typeof partner_chart_id !== 'string' || !partner_chart_id) return NextResponse.json({ error: 'partner_chart_id and answers required' }, { status: 400 })
  if (!validAnswers(answers)) return NextResponse.json({ error: 'Invalid answers' }, { status: 400 })

  const adminSupa = createAdminClient()
  const { data: chart, error: chartError } = await adminSupa.from('charts')
    .select('id, chart_label, intake_relational_complete, partner_intake_token_hash, partner_intake_token_expires_at')
    .eq('id', partner_chart_id).maybeSingle()
  // Same response for unknown chart and bad token, so ids cannot be probed.
  if (chartError || !chart || chart.chart_label !== 'partner' ||
      !partnerTokenValid(token, chart.partner_intake_token_hash, chart.partner_intake_token_expires_at)) {
    return NextResponse.json({ error: 'This link is invalid or has expired' }, { status: 403 })
  }
  if (chart.intake_relational_complete === true) return NextResponse.json({ error: 'Intake already submitted' }, { status: 409 })

  const { data: updated, error } = await adminSupa.from('charts')
    .update({
      intake_relational: answers,
      ...(complete ? { intake_relational_complete: true, partner_intake_token_hash: null, partner_intake_token_expires_at: null } : {}),
    })
    .eq('id', partner_chart_id)
    .eq('partner_intake_token_hash', chart.partner_intake_token_hash)
    .or('intake_relational_complete.is.null,intake_relational_complete.eq.false')
    .select('id')
  if (error) return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  if (!updated?.length) return NextResponse.json({ error: 'This link is no longer active' }, { status: 409 })

  return NextResponse.json({ success: true })
}
