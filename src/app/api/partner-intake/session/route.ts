import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  PARTNER_INTAKE_TABLE,
  PARTNER_INVITATION_TABLE,
  activeInvitationsForEmail,
  isUuid,
} from '@/lib/partner-access'
import { verifiedPartner } from '@/lib/partner-session'
import { RELATIONAL_QUESTIONNAIRE_VERSION, toRelationalSubmission } from '@/lib/intake-questions'
import { lovingByDesignClosed } from '@/lib/product-availability'

// Opened by the partner form on load. Partner B must be signed in through the
// email link sent to the invited address (see lib/partner-access.ts).
//   - The session's verified email must match an active invitation.
//   - The first verified access binds the intake to Partner B's user id. Any
//     other identity is refused from then on, the purchaser included.
// Only Partner B's own answers are ever returned; the purchaser's never are.

const NO_INVITATION = 'There is no active questionnaire for this email address. Ask your partner to send a new invitation.'
const NOT_YOURS     = 'This questionnaire belongs to another person'

export async function POST(request: NextRequest) {
  const closed = lovingByDesignClosed()
  if (closed) return closed
  const partner = await verifiedPartner()
  if ('response' in partner) return partner.response
  const { user, email } = partner
  const body = await request.json().catch(() => ({})) as { invitation_id?: unknown }

  const admin = createAdminClient()
  const invitations = (await activeInvitationsForEmail(admin, email)).filter(inv => inv.purchaser_user_id !== user.id)
  const wanted = isUuid(body.invitation_id) ? invitations.filter(inv => inv.id === body.invitation_id) : invitations
  if (wanted.length === 0) return NextResponse.json({ error: NO_INVITATION, code: 'no_invitation' }, { status: 403 })
  if (wanted.length > 1) {
    return NextResponse.json({ choose: wanted.map(inv => ({ invitation_id: inv.id, created_at: inv.created_at })) })
  }
  const invitation = wanted[0]

  const { data: existing, error: lookupError } = await admin.from(PARTNER_INTAKE_TABLE)
    .select('partner_user_id, questionnaire_version, answers, complete')
    .eq('partner_chart_id', invitation.partner_chart_id).maybeSingle()
  if (lookupError) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })

  let intake = existing
  if (!intake) {
    const { error: insertError } = await admin.from(PARTNER_INTAKE_TABLE).insert({
      partner_chart_id:      invitation.partner_chart_id,
      partner_user_id:       user.id,
      partner_email:         email,
      questionnaire_version: RELATIONAL_QUESTIONNAIRE_VERSION,
      answers:               {},
    })
    // A concurrent first access loses on the primary key and is re-checked below.
    if (insertError && insertError.code !== '23505') return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
    const { data: reread } = await admin.from(PARTNER_INTAKE_TABLE)
      .select('partner_user_id, questionnaire_version, answers, complete')
      .eq('partner_chart_id', invitation.partner_chart_id).maybeSingle()
    intake = reread
  }
  if (!intake || intake.partner_user_id !== user.id) {
    return NextResponse.json({ error: NOT_YOURS, code: 'not_yours' }, { status: 403 })
  }

  if (!invitation.accepted_at) {
    await admin.from(PARTNER_INVITATION_TABLE).update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id).is('accepted_at', null)
  }

  return NextResponse.json({
    invitation_id: invitation.id,
    complete:      intake.complete === true,
    earlier_version: intake.questionnaire_version !== RELATIONAL_QUESTIONNAIRE_VERSION,
    answers:       toRelationalSubmission((intake.answers ?? {}) as Record<string, unknown>, false),
  })
}
