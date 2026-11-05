// Loving By Design (Synastry and HD Composite) is gated by three independent
// switches so that opening the questionnaire never opens checkout or readings:
//   - LOVING_BY_DESIGN_AVAILABLE: product pages, relationship intake, partner
//     invitations and Partner B's questionnaire. While false they redirect or
//     refuse and the products list offers no button.
//   - LOVING_BY_DESIGN_PURCHASE_AVAILABLE: the products list checkout button and
//     /api/stripe/checkout for the Loving By Design prices. Stays false until the
//     GHL integration is implemented.
//   - LOVING_BY_DESIGN_READINGS_AVAILABLE: the interpret routes. Stays false
//     until Partner B's confidential answers are protected by more than the
//     prompt; today nothing outside the model prevents a reading from quoting
//     them to the purchaser.

export const LOVING_BY_DESIGN_AVAILABLE = false

export const LOVING_BY_DESIGN_PURCHASE_AVAILABLE = false

export const LOVING_BY_DESIGN_READINGS_AVAILABLE = false

export const LOVING_BY_DESIGN_PRODUCTS: readonly string[] = ['synastry_report', 'hd_composite_report']

export const LOVING_BY_DESIGN_UNAVAILABLE = 'Loving By Design is not yet available'

export const LOVING_BY_DESIGN_READINGS_UNAVAILABLE = 'Loving By Design readings are not yet available'

export function lovingByDesignClosed(): Response | null {
  return LOVING_BY_DESIGN_AVAILABLE ? null : Response.json({ error: LOVING_BY_DESIGN_UNAVAILABLE }, { status: 403 })
}

export function lovingByDesignReadingsClosed(): Response | null {
  return LOVING_BY_DESIGN_AVAILABLE && LOVING_BY_DESIGN_READINGS_AVAILABLE
    ? null
    : Response.json({ error: LOVING_BY_DESIGN_READINGS_UNAVAILABLE }, { status: 403 })
}

export function lovingByDesignPurchasable(): boolean {
  return LOVING_BY_DESIGN_AVAILABLE && LOVING_BY_DESIGN_PURCHASE_AVAILABLE
}

// Stripe price ids of the Loving By Design products (empty env vars excluded).
export function lovingByDesignPriceIds(): string[] {
  return [process.env.STRIPE_PRICE_SYNASTRY, process.env.STRIPE_PRICE_HD_COMPOSITE]
    .filter((id): id is string => !!id)
}
