import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasEntitlement, loadOwnedPair } from '@/lib/interpret/backend'
import {
  INVITATION_TTL_DAYS,
  PARTNER_INTAKE_TABLE,
  PARTNER_INVITATION_TABLE,
  activeInvitationForChart,
  invitationActive,
  normalizeEmail,
  partnerRedirectUrl,
  rateLimited,
  sendPartnerSignInLink,
} from '@/lib/partner-access'
import { lovingByDesignClosed } from '@/lib/product-availability'

// The purchaser (Person A) invites Partner B by email, checks the invitation's
// status, resends it or revokes it. The purchaser never receives a link, a
// token or any of Partner B's answers: Supabase Auth mails the sign-in link to
// Partner B's address only (see lib/partner-access.ts). Once Partner B has
// started, a new invitation may only go to the same address, so reissuing never
// hands the questionnaire to someone else.

const HOUR = 60 * 60 * 1000

interface PartnerContext {
  admin:          SupabaseClient
  userId:         string
  ownEmail:       string
  partnerChartId: string
}

async function purchaserContext(): Promise<PartnerContext | Response> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await hasEntitlement(supabase, user.id, ['synastry_report', 'hd_composite_report']))) {
    return NextResponse.json({ error: 'Not purchased' }, { status: 403 })
  }
  const pair = await loadOwnedPair(supabase, user.id)
  if (pair instanceof Response) return pair
  if (pair.self.intake_relational_complete !== true || pair.partner.chart_label !== 'partner') {
    return NextResponse.json({ error: 'Complete your relationship intake first' }, { status: 409 })
  }
  return {
    admin:          createAdminClient(),
    userId:         user.id,
    ownEmail:       (user.email ?? '').toLowerCase(),
    partnerChartId: String(pair.partner.id),
  }
}

async function intakeState(admin: SupabaseClient, partnerChartId: string) {
  const { data } = await admin.from(PARTNER_INTAKE_TABLE)
    .select('partner_email, complete').eq('partner_chart_id', partnerChartId).maybeSingle()
  return { startedBy: (data?.partner_email as string | undefined) ?? null, submitted: data?.complete === true }
}

export async function GET() {
  const closed = lovingByDesignClosed()
  if (closed) return closed
  const ctx = await purchaserContext()
  if (ctx instanceof Response) return ctx
  const inv = await activeInvitationForChart(ctx.admin, ctx.partnerChartId)
  const { startedBy, submitted } = await intakeState(ctx.admin, ctx.partnerChartId)
  return NextResponse.json({
    invitation: inv ? {
      email:      inv.invitee_email,
      created_at: inv.created_at,
      expires_at: inv.expires_at,
      status:     invitationActive(inv) ? 'active' : 'expired',
    } : null,
    started:   startedBy !== null,
    submitted,
  })
}

export async function POST(request: NextRequest) {
  const closed = lovingByDesignClosed()
  if (closed) return closed
  const ctx = await purchaserContext()
  if (ctx instanceof Response) return ctx
  const body = await request.json().catch(() => ({})) as { email?: unknown }
  const email = normalizeEmail(body.email)
  if (!email) return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
  if (email === ctx.ownEmail) {
    return NextResponse.json({ error: 'Your partner needs their own email address' }, { status: 400 })
  }

  const { startedBy, submitted } = await intakeState(ctx.admin, ctx.partnerChartId)
  if (submitted) return NextResponse.json({ error: 'Your partner has already submitted their intake' }, { status: 409 })
  if (startedBy !== null && startedBy !== email) {
    return NextResponse.json({ error: 'Your partner has already started with a different email address' }, { status: 409 })
  }
  if (await rateLimited(ctx.admin, 'invite', ctx.userId, 5, HOUR)) {
    return NextResponse.json({ error: 'Too many invitations. Please try again later.' }, { status: 429 })
  }

  // One active invitation per partner chart: the previous one stops working.
  const now = new Date()
  const { error: revokeError } = await ctx.admin.from(PARTNER_INVITATION_TABLE)
    .update({ revoked_at: now.toISOString() })
    .eq('partner_chart_id', ctx.partnerChartId).is('revoked_at', null)
  if (revokeError) return NextResponse.json({ error: 'Invitation failed' }, { status: 500 })
  const { error: insertError } = await ctx.admin.from(PARTNER_INVITATION_TABLE).insert({
    partner_chart_id:  ctx.partnerChartId,
    purchaser_user_id: ctx.userId,
    invitee_email:     email,
    expires_at:        new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * HOUR).toISOString(),
  })
  if (insertError) return NextResponse.json({ error: 'Invitation failed' }, { status: 500 })

  const status = await sendPartnerSignInLink(email, partnerRedirectUrl(request.headers))
  if (status >= 400) {
    console.error('[partner-invite] sign-in link not sent, auth status', status)
    return NextResponse.json({ sent: false, error: 'The invitation is saved but the email could not be sent. Please try again later.' }, { status: 503 })
  }
  return NextResponse.json({ sent: true })
}

export async function DELETE() {
  const closed = lovingByDesignClosed()
  if (closed) return closed
  const ctx = await purchaserContext()
  if (ctx instanceof Response) return ctx
  const { submitted } = await intakeState(ctx.admin, ctx.partnerChartId)
  if (submitted) return NextResponse.json({ error: 'Your partner has already submitted their intake' }, { status: 409 })
  const { error } = await ctx.admin.from(PARTNER_INVITATION_TABLE)
    .update({ revoked_at: new Date().toISOString() })
    .eq('partner_chart_id', ctx.partnerChartId).is('revoked_at', null)
  if (error) return NextResponse.json({ error: 'Revoke failed' }, { status: 500 })
  return NextResponse.json({ revoked: true })
}
