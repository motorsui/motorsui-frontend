import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

// Person B's answers live in partner_relational_intakes (RLS on, no policies,
// migration 20261104), never on the partner chart row the purchaser can read.
// The share link is claimed by the first browser that opens it: a random
// secret goes to that browser as an httpOnly cookie and only its SHA-256 hash
// is stored. Every later read or write of the answers must present the cookie,
// so holding the link alone no longer reaches them once it has been opened.

export const PARTNER_INTAKE_TABLE = 'partner_relational_intakes'
export const PARTNER_CLAIM_PATH   = '/api/partner-intake'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isPartnerChartId(id: unknown): id is string {
  return typeof id === 'string' && UUID.test(id)
}

export function partnerClaimCookieName(partnerChartId: string): string {
  return `mp_partner_claim_${partnerChartId.toLowerCase()}`
}

function hashSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex')
}

export function mintPartnerClaim(): { secret: string; hash: string } {
  const secret = randomBytes(32).toString('base64url')
  return { secret, hash: hashSecret(secret) }
}

export function partnerClaimValid(secret: unknown, storedHash: string | null | undefined): boolean {
  if (typeof secret !== 'string' || secret.length < 32 || secret.length > 128 || !storedHash) return false
  const a = Buffer.from(hashSecret(secret), 'hex')
  const b = Buffer.from(storedHash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

export function partnerClaimCookieOptions(expiresAt: string) {
  return {
    httpOnly: true,
    secure:   true,
    sameSite: 'strict' as const,
    path:     PARTNER_CLAIM_PATH,
    expires:  new Date(expiresAt),
  }
}

// The answers are returned only once Person B has submitted; a partial intake
// never reaches a reading. Read with the service-role client.
export async function loadSubmittedPartnerAnswers(
  admin: SupabaseClient,
  partnerChartId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await admin.from(PARTNER_INTAKE_TABLE)
    .select('answers, complete').eq('partner_chart_id', partnerChartId).maybeSingle()
  if (error) { console.error('[partner-intake] load failed:', error.message); return null }
  return data?.complete === true ? (data.answers as Record<string, unknown>) : null
}

export async function partnerIntakeSubmitted(admin: SupabaseClient, partnerChartId: string): Promise<boolean> {
  const { data, error } = await admin.from(PARTNER_INTAKE_TABLE)
    .select('complete').eq('partner_chart_id', partnerChartId).maybeSingle()
  if (error) { console.error('[partner-intake] status failed:', error.message); return false }
  return data?.complete === true
}
