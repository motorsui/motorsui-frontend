import Stripe from 'stripe'

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

// Maps each Stripe price ID to the product key stored in purchased_products[].
// Keys with empty env vars are excluded at runtime.
export function buildPriceProductMap(): Record<string, string> {
  const entries: Array<[string, string]> = [
    [process.env.STRIPE_PRICE_ASTRO            ?? '', 'natal_report'],
    [process.env.STRIPE_PRICE_HD               ?? '', 'hd_report'],
    [process.env.STRIPE_PRICE_DCHARTS          ?? '', 'divcharts_report'],
    [process.env.STRIPE_PRICE_COMBINED         ?? '', 'combined_report'],
    [process.env.STRIPE_PRICE_SYNASTRY         ?? '', 'synastry_report'],
    [process.env.STRIPE_PRICE_HD_COMPOSITE     ?? '', 'hd_composite_report'],
    [process.env.STRIPE_PRICE_PARENTING_ASTRO  ?? '', 'parenting_astro_report'],
    [process.env.STRIPE_PRICE_PARENTING_HD     ?? '', 'parenting_hd_report'],
  ]
  return Object.fromEntries(entries.filter(([priceId]) => priceId !== ''))
}

export function productForPrice(priceId: string): string | null {
  return buildPriceProductMap()[priceId] ?? null
}

export function allPriceIds(): string[] {
  return Object.keys(buildPriceProductMap())
}
