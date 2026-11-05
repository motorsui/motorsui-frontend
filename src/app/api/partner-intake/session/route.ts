import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { partnerTokenValid } from '@/lib/partner-intake-token'
import {
  PARTNER_INTAKE_TABLE,
  isPartnerChartId,
  mintPartnerClaim,
  partnerClaimCookieName,
  partnerClaimCookieOptions,
  partnerClaimValid,
} from '@/lib/partner-intake-claim'
import { RELATIONAL_QUESTIONNAIRE_VERSION, toRelationalSubmission } from '@/lib/intake-questions'
import { lovingByDesignClosed } from '@/lib/product-availability'

// Opened by the partner form on load (/intake/partner?id=&t=). The partner is
// not signed in.
//   - A browser holding this link's claim cookie gets its own saved answers
//     back, so the intake resumes where it stopped.
//   - Otherwise the link token must match the partner chart's stored hash.
//     The first browser to present it claims the intake: a claim cookie is set
//     and the intake row is created with no answers. Any other browser is
//     refused from then on, the purchaser included.
// Only the partner's own answers are ever returned; the purchaser's never are.

const INVALID = 'This link is invalid or has expired'

export async function POST(request: NextRequest) {
  const closed = lovingByDesignClosed()
  if (closed) return closed
  const body = await request.json().catch(() => ({})) as { partner_chart_id?: unknown; token?: unknown }
  const partnerChartId = body.partner_chart_id
  if (!isPartnerChartId(partnerChartId)) return NextResponse.json({ error: INVALID }, { status: 403 })

  const admin = createAdminClient()
  const { data: intake, error: intakeError } = await admin.from(PARTNER_INTAKE_TABLE)
    .select('answers, complete, claim_hash, claim_expires_at')
    .eq('partner_chart_id', partnerChartId).maybeSingle()
  if (intakeError) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })

  const cookieName = partnerClaimCookieName(partnerChartId)
  if (intake && partnerClaimValid(request.cookies.get(cookieName)?.value, intake.claim_hash)) {
    if (intake.complete === true) return NextResponse.json({ error: 'Intake already submitted' }, { status: 409 })
    if (Date.parse(intake.claim_expires_at) <= Date.now()) return NextResponse.json({ error: INVALID }, { status: 403 })
    return NextResponse.json({ answers: toRelationalSubmission((intake.answers ?? {}) as Record<string, unknown>, false) })
  }

  // No claim from this browser: the link token is required.
  const { data: chart, error: chartError } = await admin.from('charts')
    .select('chart_label, partner_intake_token_hash, partner_intake_token_expires_at')
    .eq('id', partnerChartId).maybeSingle()
  // Same response for unknown chart and bad token, so ids cannot be probed.
  if (chartError || !chart || chart.chart_label !== 'partner' ||
      !partnerTokenValid(body.token, chart.partner_intake_token_hash, chart.partner_intake_token_expires_at)) {
    return NextResponse.json({ error: INVALID }, { status: 403 })
  }
  if (intake) {
    return NextResponse.json({ error: 'This link has already been opened in another browser' }, { status: 403 })
  }

  const { secret, hash } = mintPartnerClaim()
  const expiresAt = chart.partner_intake_token_expires_at as string
  const { error: insertError } = await admin.from(PARTNER_INTAKE_TABLE).insert({
    partner_chart_id:      partnerChartId,
    questionnaire_version: RELATIONAL_QUESTIONNAIRE_VERSION,
    answers:               {},
    claim_hash:            hash,
    claim_expires_at:      expiresAt,
  })
  // A concurrent first open loses on the primary key.
  if (insertError) {
    if (insertError.code === '23505') return NextResponse.json({ error: 'This link has already been opened in another browser' }, { status: 403 })
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }

  const res = NextResponse.json({ answers: {} })
  res.cookies.set(cookieName, secret, partnerClaimCookieOptions(expiresAt))
  return res
}
