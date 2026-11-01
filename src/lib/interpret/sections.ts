// Section columns per product, shared by the interpret routes and the product
// clients. Order and names match the backend's VALID_SECTIONS.

export const NATAL_COLUMNS = [
  'interp_identity', 'interp_relationships', 'interp_wealth', 'interp_career',
  'interp_health', 'interp_children', 'interp_father', 'interp_mother',
  'interp_lineage', 'interp_spirituality', 'interp_purpose', 'interp_siblings',
  'interp_crisis_transformation', 'interp_rahu', 'interp_ketu',
  'interp_dignities', 'interp_dasha_timeline', 'interp_purusharthas',
] as const

export const DCHART_COLUMNS = [
  'interp_d2', 'interp_d3', 'interp_d4', 'interp_d5', 'interp_d6',
  'interp_d7', 'interp_d8', 'interp_d9', 'interp_d10', 'interp_d11',
  'interp_d12', 'interp_d16', 'interp_d20', 'interp_d24', 'interp_d27',
  'interp_d30', 'interp_d40', 'interp_d45', 'interp_d60',
] as const

export const HD_COLUMNS = [
  'hd_type_strategy_authority', 'hd_profile', 'hd_incarnation_cross', 'hd_definition',
  'hd_center_head', 'hd_center_ajna', 'hd_center_throat', 'hd_center_g',
  'hd_center_heart', 'hd_center_sacral', 'hd_center_solar_plexus',
  'hd_center_spleen', 'hd_center_root',
  'hd_variables', 'hd_shadow_gates', 'hd_circuits', 'hd_timing_events',
  'hd_channels', 'hd_gates',
] as const

// Text columns hold strings; hd_channels / hd_gates are JSONB holding either a
// string or a keyed object. Either form, when non-empty, counts as present.
export function isMissing(v: unknown): boolean {
  if (typeof v === 'string') return v.trim() === ''
  if (v && typeof v === 'object') return Object.keys(v).length === 0
  return true
}
