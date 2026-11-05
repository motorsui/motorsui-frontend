import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { extractBirthPayload, fetchDomainConclusions, jyotishOnlyConclusions } from '@/lib/interpret/domain-conclusions'
import {
  birthFromChartJson, configureSystemDoc, fetchCalculation, fetchGoverningDoc, findOrCreatePairRow,
  generateDirect, hasEntitlement, isMissing, jsonError, loadOwnedPair, sectionStream, writeRow,
} from '@/lib/interpret/backend'
import { buildPairIntakePayload } from '@/lib/intake-questions'
import { loadSubmittedPartnerAnswers } from '@/lib/partner-intake-claim'
import { lovingByDesignClosed } from '@/lib/product-availability'

// ─── Loving Astro (synastry) ──────────────────────────────────────────────────
//
// Generated here. Governing documents, served by the backend:
//   CLAUDE_SYSTEM.md + CLAUDE_SYNASTRY.md + PSYCHOLOGY LAYER (CLAUDE_CORE_SYNASTRY.md)
//   + OUTER PLANET LAYER (CLAUDE_CORE_OUTER_PLANETS.md)
//
// Person A is the caller's own chart; Person B is the caller's partner chart.
// The browser supplies neither: both are resolved from the caller's rows.
// Payload: both persons' natal astrology (HD stripped) plus the calculated
// /astrology/synastry compatibility signals, intake and domain conclusions.
// Compatibility content explicitly authorized in every user message discipline declaration.

const TABLE = 'synastry_interpretations'

// ─── Section definitions — 30 fixed sections ─────────────────────────────────

interface SynSectionDef {
  column:  string
  name:    string
  wordCap: number
}

const SYNASTRY_SECTIONS: SynSectionDef[] = [
  // Ashtakuta Moon Compatibility (9 sections)
  {
    column:  'synastry_ashtakuta_total',
    name:    'the complete Ashtakuta Moon compatibility analysis — all eight kuta scores, the total score out of 36, any doshas present, any cancellation rules that apply, and what the combined Ashtakuta picture means for this relationship\'s emotional, physical, and material compatibility',
    wordCap: 800,
  },
  {
    column:  'synastry_nadi',
    name:    'Nadi Kuta — Person A and Person B Nadi dosha (Kapha, Pitta, Vata classification of both moons), whether dosha is present, whether any cancellation rule applies, and what Nadi kuta reveals about constitutional and generational compatibility',
    wordCap: 400,
  },
  {
    column:  'synastry_bhakoot',
    name:    'Bhakoot Kuta — the sign-count relationship between Person A and Person B Moon signs, whether Bhakoot dosha is present (2-12, 6-8, or 5-9 patterns), any cancellation rules, and what Bhakoot kuta reveals about emotional and financial compatibility',
    wordCap: 400,
  },
  {
    column:  'synastry_gana',
    name:    'Gana Kuta — Deva, Manushya, or Rakshasa classification for both Person A and Person B moons, the compatibility score, and what temperament alignment or friction this Gana match produces',
    wordCap: 400,
  },
  {
    column:  'synastry_graha_maitri',
    name:    'Graha Maitri Kuta — the Moon sign lord for each person, the naisargika (permanent) friendship between those two lords, the score this produces, and what it means for mental and philosophical compatibility',
    wordCap: 400,
  },
  {
    column:  'synastry_yoni',
    name:    'Yoni Kuta — the animal symbol for each person\'s Moon nakshatra, the gender pairing, whether the animals are friendly, neutral, or enemy, the score, and what Yoni kuta reveals about sexual, instinctual, and energetic compatibility',
    wordCap: 400,
  },
  {
    column:  'synastry_tara',
    name:    'Tara Kuta — the nakshatra counting relationship between Person A and Person B moon nakshatras (counting from A to B and B to A), the favorable or unfavorable Tara number, the score, and what this reveals about destiny and fortune compatibility',
    wordCap: 400,
  },
  {
    column:  'synastry_vashya',
    name:    'Vashya Kuta — the natural magnetic influence relationship between both persons\' Moon signs (which sign draws which), the score, and what this reveals about attraction and natural influence dynamics in the relationship',
    wordCap: 400,
  },
  {
    column:  'synastry_varna',
    name:    'Varna Kuta — the Varna rank of each person\'s Moon sign (Brahmin, Kshatriya, Vaishya, Shudra), whether Person B\'s Varna is equal to or higher than Person A\'s, the score, and what this reveals about spiritual compatibility',
    wordCap: 400,
  },

  // Dosha Analysis (3 sections)
  {
    column:  'synastry_mangal_dosha',
    name:    'Mangal Dosha analysis for both Person A and Person B — which houses Mars occupies from Lagna, Moon, and Venus for each person, whether Mangal Dosha is present for either or both, the specific house positions that trigger it, and any cancellation rules that apply (Mars in own sign, exalted, or with benefics)',
    wordCap: 600,
  },
  {
    column:  'synastry_rajju',
    name:    'Rajju Dosha — Rajju group classification of both persons\' Moon nakshatras (Padha, Udara, Kantha, Siro, or Pada groups), whether they fall in the same Rajju group, whether dosha is present, and its significance for the longevity and stability of this relationship',
    wordCap: 500,
  },
  {
    column:  'synastry_vedha',
    name:    'Vedha Dosha — whether Person A and Person B Moon nakshatras form a Vedha (obstacle) pair according to the classical Vedha nakshatra list, dosha status, and its significance for relationship harmony and obstacle avoidance',
    wordCap: 500,
  },

  // Planetary Overlay — Person A's planets in Person B's houses (9 sections)
  {
    column:  'synastry_overlay_sun',
    name:    'Person A\'s natal Sun falling in Person B\'s Whole Sign house system (sidereal Lahiri) — identify which house number it occupies, the BPHS significations of that house for relationships, how Person A\'s Sun energy activates and illuminates that domain of Person B\'s life, Person A\'s Sun dignity in Person B\'s context, and what this overlay creates in the relationship dynamic between them',
    wordCap: 800,
  },
  {
    column:  'synastry_overlay_moon',
    name:    'Person A\'s natal Moon falling in Person B\'s Whole Sign house system — which house, how Person A\'s emotional and nurturing energy conditions that domain of Person B\'s life, the relational and somatic impact of this Moon overlay on how Person B experiences Person A emotionally, and what it means for the emotional bond between them',
    wordCap: 1000,
  },
  {
    column:  'synastry_overlay_mars',
    name:    'Person A\'s natal Mars falling in Person B\'s Whole Sign house system — which house, how Person A\'s drive, assertion, and activation energy lands in that domain of Person B\'s life, whether it challenges or empowers Person B in that area, and what the Martian energy overlay creates for ambition, conflict, and physical chemistry',
    wordCap: 800,
  },
  {
    column:  'synastry_overlay_mercury',
    name:    'Person A\'s natal Mercury falling in Person B\'s Whole Sign house system — which house, how Person A\'s communication, intelligence, and analytical energy activates that domain for Person B, and what this creates for mental connection, shared language, and intellectual compatibility',
    wordCap: 700,
  },
  {
    column:  'synastry_overlay_jupiter',
    name:    'Person A\'s natal Jupiter falling in Person B\'s Whole Sign house system — which house, how Person A\'s wisdom, expansion, and grace bless or challenge that domain of Person B\'s life, what Person A teaches or expands for Person B, and what this Guru overlay creates for growth and meaning in the relationship',
    wordCap: 800,
  },
  {
    column:  'synastry_overlay_venus',
    name:    'Person A\'s natal Venus falling in Person B\'s Whole Sign house system — which house, how Person A\'s pleasure, beauty, and desire activate and beautify that domain of Person B\'s life, what Person A brings to Person B in terms of love, aesthetics, and connection, and what this Venus overlay means for attraction and partnership',
    wordCap: 900,
  },
  {
    column:  'synastry_overlay_saturn',
    name:    'Person A\'s natal Saturn falling in Person B\'s Whole Sign house system — which house, whether Saturn disciplines, restricts, stabilizes, or burdens Person B in that domain, the karmic weight of this overlay, and what long-term structure or limitation Person A\'s Saturn creates for Person B',
    wordCap: 800,
  },
  {
    column:  'synastry_overlay_rahu',
    name:    'Person A\'s natal Rahu falling in Person B\'s Whole Sign house system — which house, how Person A\'s evolutionary hunger and amplification energy activates or destabilizes that domain of Person B\'s life, and what obsession or growth this Rahu overlay creates in the relationship field',
    wordCap: 700,
  },
  {
    column:  'synastry_overlay_ketu',
    name:    'Person A\'s natal Ketu falling in Person B\'s Whole Sign house system — which house, how Person A\'s past-life mastery and detachment energy creates release or withdrawal in that domain of Person B\'s life, and what karmic completion this Ketu overlay activates between them',
    wordCap: 700,
  },

  // Cross-Chart Aspects (1 section)
  {
    column:  'synastry_cross_aspects',
    name:    'all active cross-chart degree-based aspects (5° orb) between Person A\'s natal planets and Person B\'s natal planets — conjunction, opposition, trine, square, sextile. For each active aspect: which planets, which persons, the orb, applying or separating where the data gives it (never inferred from the angle alone), aspect character, and what this specific planetary interaction creates in the relationship dynamic. Also include any Graha Drishti (Parashari house-based aspects) that cross the two charts. Then the Uranus, Neptune and Pluto contacts in compatibility.outer_planet_contacts, as a secondary modern layer under the OUTER PLANET LAYER: only those listed contacts carry relational meaning, and shared_generational_placements are generational, never compatibility evidence',
    wordCap: 2000,
  },

  // Marriage Indicators (3 sections)
  {
    column:  'synastry_7th_house',
    name:    'the 7th house relationship signatures for both Person A and Person B — 7th house lord for each (sign, house placement, dignity), planets occupying the 7th for each, the Darakaraka (DK) for each person, and how these marriage indicators interact when overlaid cross-chart. What does each person\'s 7th house show they seek in partnership, and how does the other person\'s chart answer that',
    wordCap: 1200,
  },
  {
    column:  'synastry_upapada_lagna',
    name:    'Upapada Lagna (UL) for both Person A and Person B — which sign each person\'s UL falls in, the lord of each UL and its placement, whether the ULs aspect or connect to each other\'s charts, and what the UL-to-UL relationship and UL-to-partner analysis reveals about marriage fate and relationship karma',
    wordCap: 1000,
  },
  {
    column:  'synastry_karaka_compatibility',
    name:    'Karaka compatibility — Person A\'s Atmakaraka (AK) and Darakaraka (DK) compared to Person B\'s AK and DK. The naisargika relationship between their AKs, between their DKs, and between each person\'s DK and the other\'s AK. What the karaka layer reveals about soul-level compatibility and whether the grahas governing each person\'s soul and spouse are in harmony',
    wordCap: 800,
  },

  // Nakshatra Layer (1 section)
  {
    column:  'synastry_nakshatra_lords',
    name:    'Nakshatra lord compatibility — the Moon nakshatra for each person, the planetary lord governing each nakshatra, the naisargika friendship between those two lords, and what this reveals about instinctual resonance, subconscious compatibility, and the quality of daily emotional attunement between Person A and Person B',
    wordCap: 600,
  },

  // Timing (1 section)
  {
    column:  'synastry_dasha_comparison',
    name:    'Dasha timing comparison — Person A\'s current Mahadasha and Antardasha lords (with dates) and Person B\'s current Mahadasha and Antardasha lords (with dates). Whether their timing cycles are mutually supportive or discordant, what each person\'s current dasha is asking of them individually, and what the combined dasha timing means for where this relationship stands in its developmental arc right now',
    wordCap: 800,
  },

  // Divisional (1 section)
  {
    column:  'synastry_navamsa',
    name:    'Navamsa (D9) comparison — key D9 positions for both persons: Sun, Moon, Venus, 7th house and its lord in each D9. How their D9 charts interact cross-chart. What the soul-level compatibility looks like in the dharmic marriage chart, and whether the D9 confirms or complicates the D1 synastry picture',
    wordCap: 1000,
  },

  // Jaimini Layer (1 section)
  {
    column:  'synastry_jaimini_aspects',
    name:    'Jaimini Rashi aspects between Person A and Person B charts — which of Person A\'s occupied signs aspect Person B\'s chart signs (and vice versa), how Person A\'s Chara Karakas fall in Person B\'s chart and Person B\'s Chara Karakas in Person A\'s chart, and what the Jaimini layer reveals about this relationship\'s karmic and dharmic purpose beyond the Parashari picture',
    wordCap: 800,
  },

  // Karmic Layer (1 section)
  {
    column:  'synastry_karmic_axis',
    name:    'Karmic Axis Overlay — how Person A\'s Rahu, Ketu, and Saturn positions interact with Person B\'s Rahu, Ketu, and Saturn positions in both degree-based aspects (5° orb) and HD gate activations. Cross-chart nodal axis inversions (whether one person\'s Rahu activates the other\'s Ketu gate), Saturn cross-chart gate bridges, and what this multi-layer karmic geometry reveals about the evolutionary purpose and karmic debt or gift at the core of this relationship',
    wordCap: 1200,
  },
]

// ─── Self-review footer ───────────────────────────────────────────────────────

const SELF_REVIEW =
  'As you write each sentence: if you use an em dash (—), replace it immediately with a ' +
  'comma or restructure the sentence. If you use "is not" or "are not", rewrite as an ' +
  'affirmative statement before continuing.'

// ─── Layer 1 — Synastry payload builder ──────────────────────────────────────
//
// Strips HD data from both charts. Sends natal astrology + birth data for each
// person, labeled person_a and person_b.

function buildSynastryPayload(chartJsonA: unknown, chartJsonB: unknown): Record<string, unknown> {
  function stripNatal(json: Record<string, unknown>): Record<string, unknown> {
    const natal = { ...(json.natal as Record<string, unknown> ?? {}) }
    delete natal.karmic_gate_overlay
    return natal
  }

  const a = chartJsonA as Record<string, unknown>
  const b = chartJsonB as Record<string, unknown>

  return {
    person_a: { natal: stripNatal(a), birth: a.birth },
    person_b: { natal: stripNatal(b), birth: b.birth },
  }
}

// ─── Layer 3 + User message builder ──────────────────────────────────────────

function buildSynastryUserMessage(section: SynSectionDef, payloadStr: string): string {
  // Layer 3 — discipline declaration + explicit compatibility authorization
  const disciplineDeclaration =
    'This is a Sidereal Lahiri Jyotish synastry section. ' +
    'This payload contains natal astrology data for two persons (no Human Design data). ' +
    'Do not reference HD gates, channels, centers, Incarnation Cross, type, profile, ' +
    'authority, variables, or any Human Design mechanic in this section. ' +
    'Interpret using classical Jyotish mechanics only. ' +
    'compatibility.outer_planet_contacts is a modern supplementary layer: use it only where the section names it, ' +
    'and never present it as Jyotish. ' +
    'Compatibility interpretation is explicitly authorized for this session.\n\n'

  const scopeBlock =
    `Interpret ${section.name}. ` +
    `Both persons\' chart data are provided labeled person_a and person_b. ` +
    `The calculated compatibility signals for the pair are in compatibility. ` +
    `Speak directly to Person A in second person. ` +
    `Reference Person B by name if a name is available in the birth data, otherwise as your partner. ` +
    `Person B's intake answers inform the reading but stay confidential: never quote, paraphrase or attribute any of them. ` +
    `No bullet points. No markdown. No asterisks. No em dashes. ` +
    `No hedging language. No textbook definitions. ` +
    SELF_REVIEW + ' ' +
    `Write up to ${section.wordCap} words. Do not exceed ${section.wordCap} words.`

  return (
    disciplineDeclaration +
    `Here is the complete chart data for both persons:\n\n${payloadStr}\n\n` +
    scopeBlock
  )
}

// ─── Route ────────────────────────────────────────────────────────────────────

// Returns the caller's stored synastry row (RLS keeps pair rows server-side).
export async function GET() {
  const closed = lovingByDesignClosed()
  if (closed) return closed
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)
  if (!(await hasEntitlement(supabase, user.id, ['synastry_report']))) return jsonError('Not purchased', 403)
  const pair = await loadOwnedPair(supabase, user.id)
  if (pair instanceof Response) return pair
  const { data } = await createAdminClient()
    .from(TABLE).select('*').eq('chart_id_a', String(pair.self.id)).eq('chart_id_b', String(pair.partner.id)).maybeSingle()
  return Response.json({ row: data ?? null })
}

export async function POST(request: NextRequest) {
  const closed = lovingByDesignClosed()
  if (closed) return closed
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)
  if (!(await hasEntitlement(supabase, user.id, ['synastry_report']))) return jsonError('Not purchased', 403)

  const body  = await request.json().catch(() => ({})) as { columns?: unknown }
  const asked = Array.isArray(body.columns) ? new Set(body.columns.map(String)) : null

  const pair = await loadOwnedPair(supabase, user.id)
  if (pair instanceof Response) return pair
  const { self, partner } = pair
  const birthA = birthFromChartJson(self.chart_json)
  const birthB = birthFromChartJson(partner.chart_json)
  if (!birthA || !birthB) return jsonError('Chart has no usable birth data', 422)
  // Each partner's answers travel with their own question wording and version,
  // under the same person_a / person_b labels as the chart payload. Nothing is
  // generated until both partners have submitted.
  const partnerAnswers = await loadSubmittedPartnerAnswers(createAdminClient(), String(partner.id))
  const intake = buildPairIntakePayload(self, partnerAnswers)
  if (!intake) return jsonError('Both partners must submit their intake before the reading is generated', 409)
  const intakeA = intake.person_a as Record<string, unknown>

  const admin = createAdminClient()
  const row   = await findOrCreatePairRow(admin, TABLE, String(self.id), String(partner.id))
  if (row instanceof Response) return row
  const missing = SYNASTRY_SECTIONS.map(s => s.column).filter(c => isMissing(row[c]) && (!asked || asked.has(c)))
  const skipped = SYNASTRY_SECTIONS.map(s => s.column).filter(c => !missing.includes(c))
  const byColumn = new Map(SYNASTRY_SECTIONS.map(s => [s.column, s]))

  // Assembled once, on first pending section. Any failure fails every section.
  let context: Promise<{ system: string; payloadStr: string }> | null = null
  const getContext = () => context ??= (async () => {
    const conclusionBirth = extractBirthPayload(self.chart_json)
    const [systemDoc, familyDoc, coreDoc, outerDoc, compatibility, conclusions] = await Promise.all([
      fetchGoverningDoc('CLAUDE_SYSTEM.md'),
      fetchGoverningDoc('CLAUDE_SYNASTRY.md'),
      fetchGoverningDoc('CLAUDE_CORE_SYNASTRY.md'),
      fetchGoverningDoc('CLAUDE_CORE_OUTER_PLANETS.md'),
      fetchCalculation('/astrology/synastry', { person1: birthA, person2: birthB }),
      conclusionBirth ? fetchDomainConclusions(conclusionBirth, 'relational', intakeA, true) : Promise.resolve(null),
    ])
    const configured = configureSystemDoc(systemDoc, {
      product:       'synastry',
      personA:       'person_a',
      personB:       'person_b',
      intake:        !!intake,
      conclusions:   !!conclusions,
      classicalOnly: false,
    })
    const payload = buildSynastryPayload(self.chart_json, partner.chart_json)
    payload.compatibility = compatibility
    payload.intake = intake
    // Astrology-only product: no HD or Gene Keys signals in the conclusions.
    if (conclusions) payload.domain_conclusions = jyotishOnlyConclusions(conclusions)
    return {
      system:     configured + '\n\n---\n\n' + familyDoc + '\n\n---\nPSYCHOLOGY LAYER\n\n' + coreDoc
                  + '\n\n---\nOUTER PLANET LAYER\n\n' + outerDoc,
      payloadStr: JSON.stringify(payload, null, 2),
    }
  })()

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const rowId     = String(row.id)

  return sectionStream('interpret-synastry', missing, skipped, async column => {
    const section = byColumn.get(column)!
    const ctx     = await getContext()
    const result  = await generateDirect({
      anthropic,
      system:  ctx.system,
      user:    buildSynastryUserMessage(section, ctx.payloadStr),
      section: column,
      product: 'synastry',
    })
    await writeRow(admin, TABLE, rowId, { [column]: result.text })
    return result
  })
}
