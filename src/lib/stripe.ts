import Stripe from 'stripe'

// Singleton Stripe server client — server-side only.
// STRIPE_SECRET_KEY must be set in .env.local (never exposed to the client).
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-05-27.dahlia',
    })
  }
  return _stripe
}

// Map Stripe Price IDs → tier granted on purchase.
// Keys match environment variable names for easy cross-reference.
export const PRICE_TIER_MAP: Record<string, number> = {
  [process.env.STRIPE_PRICE_HD      ?? '']: 2,
  [process.env.STRIPE_PRICE_DCHARTS ?? '']: 2,
  [process.env.STRIPE_PRICE_COMPAT  ?? '']: 2,
}

export function tierForPrice(priceId: string): number {
  return PRICE_TIER_MAP[priceId] ?? 2
}
