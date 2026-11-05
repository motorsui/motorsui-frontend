import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  PARTNER_INTAKE_TABLE,
  PARTNER_INVITATION_TABLE,
  invitationActive,
  isUuid,
  type Invitation,
} from '@/lib/partner-access'
import { verifiedPartner } from '@/lib/partner-session'
import {
  RELATIONAL_QUESTIONNAIRE_VERSION,
  missingRelationalAnswers,
  toRelationalSubmission,
} from '@/lib/intake-questions'
import { lovingByDesignClosed } from '@/lib/product-availability'

// Autosave and final submit for Partner B's intake. The credential is Partner
// B's verified email session (see lib/partner-access.ts), checked against an
// active invitation and against the user id the intake is bound to. Writes go
// to partner_relational_intakes only, never to charts. Writes are accepted
// only while the intake is not yet complete; the final submit (complete: true)
// requires every question answered and locks the row in the database.
// Answers must be a small object of strings.

const MAX_ANSWERS      = 60
const MAX_ANSWER_CHARS = 4000
const INACTIVE         = 'This invitation is no longer active. Ask your partner to send a new invitation.'

function validAnswers(answers: unknown): answers is Record<string, string> {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return false
  const entries = Object.entries(answers)
  return entries.length > 0 && entries.length <= MAX_ANSWERS &&
    entries.every(([k, v]) => k.length <= 100 && typeof v === 'string' && v.length <= MAX_ANSWER_CHARS)
}

export async function POST(request: NextRequest) {
  const closed = lovingByDesignClosed()
  if (closed) return closed
  const partner = await verifiedPartner()
  if ('response' in partner) return partner.response
  const { user, email } = partner
  const body = await request.json().catch(() => ({})) as { invitation_id?: unknown; answers?: unknown; complete?: unknown }
  const { invitation_id: invitationId, answers } = body
  const complete = body.complete === true
  if (!isUuid(invitationId)) return NextResponse.json({ error: INACTIVE }, { status: 403 })
  if (!validAnswers(answers)) return NextResponse.json({ error: 'Invalid answers' }, { status: 400 })

  const admin = createAdminClient()
  const { data: inv } = await admin.from(PARTNER_INVITATION_TABLE).select('*').eq('id', invitationId).maybeSingle()
  const invitation = inv as Invitation | null
  if (!invitation || !invitationActive(invitation) || invitation.invitee_email !== email || invitation.purchaser_user_id === user.id) {
    return NextResponse.json({ error: INACTIVE }, { status: 403 })
  }

  const { data: intake, error: intakeError } = await admin.from(PARTNER_INTAKE_TABLE)
    .select('partner_user_id, questionnaire_version, complete')
    .eq('partner_chart_id', invitation.partner_chart_id).maybeSingle()
  if (intakeError) return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  if (!intake || intake.partner_user_id !== user.id) {
    return NextResponse.json({ error: 'This questionnaire belongs to another person' }, { status: 403 })
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
      answers: toRelationalSubmission(answers, false),
      ...(complete ? { complete: true, submitted_at: now } : {}),
    })
    .eq('partner_chart_id', invitation.partner_chart_id)
    .eq('partner_user_id', user.id)
    .eq('complete', false)
    .select('partner_chart_id')
  if (error) return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  if (!updated?.length) return NextResponse.json({ error: 'Intake already submitted' }, { status: 409 })

  return NextResponse.json({ success: true })
}
