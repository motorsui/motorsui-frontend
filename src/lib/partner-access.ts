import { createHmac } from 'node:crypto'
import type { SupabaseClient, User } from '@supabase/supabase-js'

// Partner B reaches the Loving By Design questionnaire only as a verified
// email identity (migration 20261104):
//   - The purchaser names Partner B's email. That creates an invitation
//     (partner_invitations, at most one active per partner chart) and Supabase
//     Auth sends a single-use sign-in link to that address.
//   - Partner B's session must have been created from an email link (amr
//     "otp"), its email must be confirmed, and it must equal the invitation's
//     email. A password session is refused even on the same account.
//   - The intake row (partner_relational_intakes) is bound to Partner B's
//     user id on first access. The database refuses any later change to that
//     binding and any change at all once the row is submitted.
// All three tables have RLS on, no policies and no client grants; only the
// service-role client used by the API routes reaches them.
// Never log emails, links, tokens or answers here.

export const PARTNER_INTAKE_TABLE     = 'partner_relational_intakes'
export const PARTNER_INVITATION_TABLE = 'partner_invitations'
export const PARTNER_EVENTS_TABLE     = 'partner_access_events'

export const INVITATION_TTL_DAYS = 30

// Sign-in methods that prove control of the inbox.
const EMAIL_LINK_METHODS = new Set(['otp', 'magiclink', 'email/signup', 'invite'])

const UUID  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isUuid(id: unknown): id is string {
  return typeof id === 'string' && UUID.test(id)
}

export function normalizeEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null
  const e = email.trim().toLowerCase()
  return e.length <= 254 && EMAIL.test(e) ? e : null
}

export interface Invitation {
  id:                string
  partner_chart_id:  string
  purchaser_user_id: string
  invitee_email:     string
  created_at:        string
  expires_at:        string
  revoked_at:        string | null
  accepted_at:       string | null
}

export function invitationActive(inv: Pick<Invitation, 'revoked_at' | 'expires_at'> | null | undefined, now = Date.now()): boolean {
  return !!inv && !inv.revoked_at && Date.parse(inv.expires_at) > now
}

// True when the session proves Partner B controls their email address.
export function emailLinkSession(user: Pick<User, 'email' | 'email_confirmed_at'> | null, amr: unknown): boolean {
  if (!user?.email || !user.email_confirmed_at) return false
  if (!Array.isArray(amr) || amr.length === 0) return false
  return amr.every(a => EMAIL_LINK_METHODS.has(typeof a === 'string' ? a : String((a as { method?: unknown } | null)?.method)))
}

// ── Rate limiting ───────────────────────────────────────────────────────────

function bucket(kind: string, value: string): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  return kind + ':' + createHmac('sha256', key).update(value, 'utf8').digest('hex')
}

// Records one attempt and reports whether the limit was already reached.
// Fails closed: a lookup error counts as limited.
export async function rateLimited(
  admin: SupabaseClient, kind: string, value: string, limit: number, windowMs: number,
): Promise<boolean> {
  const b = bucket(kind, value)
  const since = new Date(Date.now() - windowMs).toISOString()
  const { count, error } = await admin.from(PARTNER_EVENTS_TABLE)
    .select('id', { count: 'exact', head: true }).eq('bucket', b).gte('created_at', since)
  if (error) return true
  if ((count ?? 0) >= limit) return true
  const { error: insertError } = await admin.from(PARTNER_EVENTS_TABLE).insert({ bucket: b })
  return !!insertError
}

export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown'
}

// ── Email ───────────────────────────────────────────────────────────────────

// Supabase Auth sends a single-use, expiring sign-in link to the address. The
// account is created on first use. Returns the Auth status code only.
export async function sendPartnerSignInLink(email: string, redirectTo: string): Promise<number> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/otp?redirect_to=${encodeURIComponent(redirectTo)}`
  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, create_user: true }),
      cache:   'no-store',
    })
    return res.status
  } catch {
    return 503
  }
}

// Where the email link returns Partner B. The address must be on the Supabase
// Auth redirect allow-list, or Auth falls back to the project's Site URL (the
// GHL site), which would put Partner B's tokens on a third-party page. Any host
// other than localhost (development) therefore gets the production address.
export function partnerRedirectUrl(headers: Headers): string {
  if (process.env.PARTNER_AUTH_REDIRECT_URL) return process.env.PARTNER_AUTH_REDIRECT_URL
  const host = headers.get('x-forwarded-host') ?? headers.get('host') ?? ''
  if (/^localhost(:\d+)?$/.test(host)) return `http://${host}/intake/partner`
  return 'https://charts.motorsui.com/intake/partner'
}

// ── Reads ───────────────────────────────────────────────────────────────────

export async function activeInvitationForChart(admin: SupabaseClient, partnerChartId: string): Promise<Invitation | null> {
  const { data } = await admin.from(PARTNER_INVITATION_TABLE).select('*')
    .eq('partner_chart_id', partnerChartId).is('revoked_at', null).maybeSingle()
  return (data as Invitation | null) ?? null
}

export async function activeInvitationsForEmail(admin: SupabaseClient, email: string): Promise<Invitation[]> {
  const { data } = await admin.from(PARTNER_INVITATION_TABLE).select('*')
    .eq('invitee_email', email).is('revoked_at', null).order('created_at', { ascending: false })
  return ((data ?? []) as Invitation[]).filter(inv => invitationActive(inv))
}

// The answers are returned only once Person B has submitted; a partial intake
// never reaches a reading. Read with the service-role client.
export async function loadSubmittedPartnerAnswers(
  admin: SupabaseClient,
  partnerChartId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await admin.from(PARTNER_INTAKE_TABLE)
    .select('answers, complete').eq('partner_chart_id', partnerChartId).maybeSingle()
  if (error) { console.error('[partner-intake] load failed:', error.code); return null }
  return data?.complete === true ? (data.answers as Record<string, unknown>) : null
}

export async function partnerIntakeSubmitted(admin: SupabaseClient, partnerChartId: string): Promise<boolean> {
  const { data, error } = await admin.from(PARTNER_INTAKE_TABLE)
    .select('complete').eq('partner_chart_id', partnerChartId).maybeSingle()
  if (error) { console.error('[partner-intake] status failed:', error.code); return false }
  return data?.complete === true
}
