/**
 * domain-conclusions.ts — Shared helper for injecting domain conclusions
 * into interpret route system prompts.
 *
 * Fetches /natal/conclusions with birth data + optional intake, then formats
 * a condensed summary block for insertion into [DOMAIN_CONCLUSIONS_JSON...].
 */

interface BirthPayload {
  year:       number
  month:      number
  day:        number
  hour:       number
  minute:     number
  utc_offset: number
  latitude:   number
  longitude:  number
}

/**
 * Extract the API-compatible birth payload from chart_json.birth.
 * chart_json.birth is stored as { birth_date, birth_time, latitude, longitude, utc_offset, ... }.
 */
export function extractBirthPayload(chartJson: unknown): BirthPayload | null {
  try {
    const cj    = chartJson as Record<string, unknown>
    const birth = cj?.birth as Record<string, unknown> | undefined
    if (!birth) return null

    const birth_date = String(birth.birth_date ?? '')
    const birth_time = String(birth.birth_time ?? '')
    if (!birth_date || !birth_time) return null

    const dateParts = birth_date.split('-').map(Number)
    const timeParts = birth_time.split(':').map(Number)
    if (dateParts.length < 3 || timeParts.length < 2) return null

    const [year, month, day] = dateParts
    const [hour, minute]     = timeParts
    const utc_offset         = Number(birth.utc_offset ?? 0)
    const latitude           = Number(birth.latitude)
    const longitude          = Number(birth.longitude)

    if (!year || !month || !day || isNaN(hour) || isNaN(minute)) return null
    if (isNaN(latitude) || isNaN(longitude))                      return null

    return { year, month, day, hour, minute, utc_offset, latitude, longitude }
  } catch {
    return null
  }
}

/**
 * Call /natal/conclusions on the Python API and return the full conclusions
 * dict, or null if the call fails (graceful degradation). Astrology-only
 * products pass jyotishOnly so the composite score excludes the HD signal.
 */
export async function fetchDomainConclusions(
  birth:       BirthPayload,
  productType: 'self' | 'relational' | 'parenting',
  intakeJson?: Record<string, unknown> | null,
  jyotishOnly = false,
): Promise<Record<string, unknown> | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.motorsui.com'

    const body: Record<string, unknown> = {
      birth,
      product_type: productType,
    }
    if (intakeJson) body.intake_json = intakeJson
    if (jyotishOnly) body.jyotish_only = true

    const res = await fetch(`${apiUrl}/natal/conclusions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(12_000),
    })

    if (!res.ok) return null
    return await res.json() as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * Jyotish view of /natal/conclusions for astrology-only products (Loving Astro,
 * D-Charts). Mirrors the backend's interpret._jyotish_only_conclusions: headline
 * signals keep system === 'jyotish' only, cross_system (HD channel, HD center
 * and Gene Keys alignment text) and its counts are dropped, and primary_note is
 * taken from the first remaining signal. Scores are unchanged.
 */
export function jyotishOnlyConclusions(
  conclusions: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!conclusions) return null
  const out: Record<string, unknown> = {}
  for (const [domain, data] of Object.entries(conclusions)) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) { out[domain] = data; continue }
    const view: Record<string, unknown> = { ...(data as Record<string, unknown>) }
    delete view.cross_system
    const sigs = ((view.headline_signals as Record<string, unknown>[] | undefined) ?? [])
      .filter(s => s?.system === 'jyotish')
    view.headline_signals = sigs
    if (view.overall && typeof view.overall === 'object') {
      const overall: Record<string, unknown> = { ...(view.overall as Record<string, unknown>) }
      delete overall.alignments_count
      delete overall.tensions_count
      overall.primary_note = sigs.length ? sigs[0].note : null
      view.overall = overall
    }
    out[domain] = view
  }
  return out
}

/**
 * Build a compact multi-line text block from domain conclusions for injection
 * into the system prompt [DOMAIN_CONCLUSIONS_JSON...] placeholder.
 *
 * Returns "Not available." if conclusions is null.
 */
export function buildDomainContextBlock(
  conclusions: Record<string, unknown> | null,
): string {
  if (!conclusions) return 'Not available.'

  try {
    const lines: string[] = []

    for (const [domain, data] of Object.entries(conclusions)) {
      const d       = data as Record<string, unknown>
      const overall = d?.overall as Record<string, unknown> | undefined
      const adj     = d?.intake_adjustment as Record<string, unknown> | undefined
      const timing  = d?.timing as Record<string, unknown> | undefined

      if (!overall) continue

      const score        = adj?.adjusted_score  ?? overall?.composite_score
      const strength     = adj?.strength_adjusted ?? overall?.strength
      const activation   = timing?.activation_level ?? 'unknown'
      const bandChanged  = adj?.band_changed === true
      const contradictions = (adj?.contradictions as string[] | undefined) ?? []

      let line = `${domain}: adjusted_score=${score}, strength=${strength}, timing=${activation}`
      if (bandChanged) line += ', band_changed=true'
      if (contradictions.length > 0) {
        const cStr = contradictions.map((c: string) => `"${c}"`).join('; ')
        line += `, contradictions=[${cStr}]`
      }
      lines.push(line)
    }

    return lines.length > 0 ? lines.join('\n') : 'Not available.'
  } catch {
    return 'Not available.'
  }
}
