import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

// Partner intake share links carry a random token. Only its SHA-256 hash is
// stored (charts.partner_intake_token_hash, migration 011), so a database read
// never yields a usable link. Minting a new token replaces the old hash.

export const PARTNER_TOKEN_TTL_DAYS = 30

export function hashPartnerToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function mintPartnerToken(now = new Date()): { token: string; hash: string; expiresAt: string } {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(now.getTime() + PARTNER_TOKEN_TTL_DAYS * 86_400_000).toISOString()
  return { token, hash: hashPartnerToken(token), expiresAt }
}

export function partnerTokenValid(
  token: unknown,
  storedHash: string | null | undefined,
  expiresAt: string | null | undefined,
  now = new Date(),
): boolean {
  if (typeof token !== 'string' || token.length < 32 || token.length > 128) return false
  if (!storedHash || !expiresAt) return false
  const expiry = Date.parse(expiresAt)
  if (Number.isNaN(expiry) || expiry <= now.getTime()) return false
  const a = Buffer.from(hashPartnerToken(token), 'hex')
  const b = Buffer.from(storedHash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

export function partnerIntakePath(partnerChartId: string, token: string): string {
  return `/intake/partner?id=${encodeURIComponent(partnerChartId)}&t=${encodeURIComponent(token)}`
}
