// Loving By Design (Synastry and HD Composite) stays closed to customers until
// Partner B email verification and secure link recovery are implemented and
// tested, and migration 20261104_partner_relational_intakes.sql is applied.
// While false, the product pages redirect, the products list offers no button,
// and every relationship intake, partner and interpretation route refuses.

export const LOVING_BY_DESIGN_AVAILABLE = false

export const LOVING_BY_DESIGN_PRODUCTS: readonly string[] = ['synastry_report', 'hd_composite_report']

export const LOVING_BY_DESIGN_UNAVAILABLE = 'Loving By Design is not yet available'

export function lovingByDesignClosed(): Response | null {
  return LOVING_BY_DESIGN_AVAILABLE ? null : Response.json({ error: LOVING_BY_DESIGN_UNAVAILABLE }, { status: 403 })
}
