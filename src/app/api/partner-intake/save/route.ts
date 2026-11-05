import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  PARTNER_INTAKE_TABLE,
  isPartnerChartId,
  partnerClaimCookieName,
  partnerClaimCookieOptions,
  partnerClaimValid,
} from '@/lib/partner-intake-claim'
import {
  RELATIONAL_QUESTIONNAIRE_VERSION,
  missingRelationalAnswers,
  toRelationalSubmission,
} from '@/lib/intake-questions'

// Autosave and final submit for the partner's intake. The credential is the
// claim cookie set by /api/partner-intake/session; the link token alone is
// not accepted. Writes go to partner_relational_intakes only, never to charts.
// Writes are accepted only while the intake is not yet complete; the final
// submit (complete: true) requires every question answered, locks the row,
// retires the link token and clears the cookie.
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
  const body = await request.json().catch(() => ({})) as { partner_chart_id?: unknown; answers?: unknown; complete?: unknown }
  const { partner_chart_id: partnerChartId, answers } = body
  const complete = body.complete === true
  if (!isPartnerChartId(partnerChartId)) return NextResponse.json({ error: 'This link is invalid or has expired' }, { status: 403 })
  if (!validAnswers(answers)) return NextResponse.json({ error: 'Invalid answers' }, { status: 400 })

  const admin = createAdminClient()
  const { data: intake, error: intakeError } = await admin.from(PARTNER_INTAKE_TABLE)
    .select('questionnaire_version, complete, claim_hash, claim_expires_at')
    .eq('partner_chart_id', partnerChartId).maybeSingle()
  if (intakeError) return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  const cookieName = partnerClaimCookieName(partnerChartId)
  if (!intake || !partnerClaimValid(request.cookies.get(cookieName)?.value, intake.claim_hash) ||
      Date.parse(intake.claim_expires_at) <= Date.now()) {
    return NextResponse.json({ error: 'This link is invalid or has expired' }, { status: 403 })
  }
  if (intake.complete === true) return NextResponse.json({ error: 'Intake already submitted' }, { status: 409 })
  if (intake.questionnaire_version !== RELATIONAL_QUESTIONNAIRE_VERSION) {
    return NextResponse.json({ error: 'Intake was started on an earlier questionnaire version' }, { status: 409 })
  }
  if (complete && missingRelationalAnswers(answers).length > 0) {
    return NextResponse.json({ error: 'Required questions are unanswered' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const { data: updated, error } = await admin.from(PARTNER_INTAKE_TABLE)
    .update({
      answers:    toRelationalSubmission(answers, false),
      updated_at: now,
      ...(complete ? { complete: true, submitted_at: now } : {}),
    })
    .eq('partner_chart_id', partnerChartId)
    .eq('claim_hash', intake.claim_hash)
    .eq('complete', false)
    .select('partner_chart_id')
  if (error) return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  if (!updated?.length) return NextResponse.json({ error: 'This link is no longer active' }, { status: 409 })

  const res = NextResponse.json({ success: true })
  if (complete) {
    const { error: tokenError } = await admin.from('charts')
      .update({ partner_intake_token_hash: null, partner_intake_token_expires_at: null })
      .eq('id', partnerChartId)
    if (tokenError) console.error('[partner-intake/save] token retire failed:', tokenError.message)
    res.cookies.set(cookieName, '', { ...partnerClaimCookieOptions(new Date(0).toISOString()), maxAge: 0 })
  }
  return res
}
