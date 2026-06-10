import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// ─── Governing documents ──────────────────────────────────────────────────────
//
// Discipline-specific doc sets. Never load all three for a single section.
//
// ASTROLOGY sections receive:
//   CLAUDE_SYSTEM.md + CLAUDE_CORE.md (voice/tier rules only, identity stripped) + CLAUDE_ASTRO.md
//
// HD sections will receive (future build):
//   CLAUDE_SYSTEM.md + CLAUDE_CORE.md (voice/tier rules only, identity stripped) + CLAUDE_HD.md
//
// Cross-system sections (Karmic Gate Overlay) will receive both discipline docs,
// explicitly labeled.

const DOC_BASE = 'https://raw.githubusercontent.com/motorsui/motorsui-chart-api/main'

const ASTRO_DOC_URLS = {
  system: `${DOC_BASE}/CLAUDE_SYSTEM.md`,
  core:   `${DOC_BASE}/CLAUDE_CORE.md`,
  astro:  `${DOC_BASE}/CLAUDE_ASTRO.md`,
}

// ─── Section definitions ──────────────────────────────────────────────────────

interface SectionDef {
  column: string
  name: string
  planetKey?: string  // planet name as it appears in natal_aspects; used to restrict cross-references
  wordCap: number     // hard maximum words for this section
}

const SECTIONS: SectionDef[] = [
  { column: 'interp_lagna',             name: 'Lagna, Lagna Lord, and Lagna Nakshatra & Pada',       planetKey: 'Lagna',      wordCap: 1800 },
  { column: 'interp_sun',               name: 'Sun placement',                                         planetKey: 'Sun',        wordCap: 1750 },
  { column: 'interp_moon',              name: 'Moon placement',                                         planetKey: 'Moon',       wordCap: 1750 },
  { column: 'interp_mercury',           name: 'Mercury placement',                                      planetKey: 'Mercury',    wordCap: 1750 },
  { column: 'interp_venus',             name: 'Venus placement',                                        planetKey: 'Venus',      wordCap: 1750 },
  { column: 'interp_mars',              name: 'Mars placement',                                         planetKey: 'Mars',       wordCap: 1750 },
  { column: 'interp_jupiter',           name: 'Jupiter placement',                                      planetKey: 'Jupiter',    wordCap: 1750 },
  { column: 'interp_saturn',            name: 'Saturn placement',                                       planetKey: 'Saturn',     wordCap: 1750 },
  { column: 'interp_uranus',            name: 'Uranus placement',                                       planetKey: 'Uranus',     wordCap: 1500 },
  { column: 'interp_neptune',           name: 'Neptune placement',                                      planetKey: 'Neptune',    wordCap: 1500 },
  { column: 'interp_pluto',             name: 'Pluto placement',                                        planetKey: 'Pluto',      wordCap: 1500 },
  { column: 'interp_rahu',              name: 'Rahu placement',                                         planetKey: 'NorthNode',  wordCap: 1750 },
  { column: 'interp_ketu',              name: 'Ketu placement',                                         planetKey: 'SouthNode',  wordCap: 1750 },
  { column: 'interp_dignities',         name: 'all planetary dignities',                                                         wordCap: 1300 },
  { column: 'interp_purusharthas',      name: 'the Dharma, Artha, Kama, Moksha balance',                                        wordCap: 1100 },
  { column: 'interp_mahadasha',         name: 'the active Mahadasha',                                                            wordCap: 1200 },
  { column: 'interp_antardasha',        name: 'the active Antardasha',                                                           wordCap: 1200 },
  { column: 'interp_dasha_transitions', name: 'upcoming Dasha transitions',                                                      wordCap: 1200 },

  // ─── D-chart sections ───────────────────────────────────────────────────────
  // Each interprets one divisional chart from the natal.divisional_charts payload.
  // Theme line tells the model what the chart governs and where to find the data.
  { column: 'interp_d2',  name: 'D2 Hora chart — wealth, material resources, financial potential',                          wordCap: 1500 },
  { column: 'interp_d3',  name: 'D3 Drekkana chart — siblings, courage, short journeys, and initiative',                    wordCap: 1500 },
  { column: 'interp_d4',  name: 'D4 Chaturthamsa chart — property, land, fortune, and home environment',                    wordCap: 1500 },
  { column: 'interp_d5',  name: 'D5 Panchamsa chart — spiritual tendencies, devotional nature, and worship patterns',       wordCap: 1500 },
  { column: 'interp_d6',  name: 'D6 Shashthamsa chart — health, physical constitution, enemies, and obstacles',             wordCap: 1500 },
  { column: 'interp_d7',  name: 'D7 Saptamsa chart — children, creative intelligence, and legacy transmission',             wordCap: 1500 },
  { column: 'interp_d8',  name: 'D8 Ashtamsa chart — chronic obstacles, longevity challenges, and karmic debts',           wordCap: 1500 },
  { column: 'interp_d9',  name: 'D9 Navamsa chart — soul purpose, dharmic marriage, and the inner life post-30',           wordCap: 1500 },
  { column: 'interp_d10', name: 'D10 Dasamsa chart — career, public role, professional vocation, and social contribution',  wordCap: 1500 },
  { column: 'interp_d11', name: 'D11 Rudramsa chart — death, transformation, deep endings, and cycle completion',           wordCap: 1500 },
  { column: 'interp_d12', name: 'D12 Dvadasamsa chart — parents, ancestry, lineage inheritance, and karmic family field',  wordCap: 1500 },
  { column: 'interp_d16', name: 'D16 Shodasamsa chart — vehicles, comforts, material pleasures, and sensory life',         wordCap: 1500 },
  { column: 'interp_d20', name: 'D20 Vimsamsa chart — spiritual practice, devotional discipline, and inner worship',        wordCap: 1500 },
  { column: 'interp_d24', name: 'D24 Chaturvimsamsa chart — education, formal learning, skill acquisition, and study',     wordCap: 1500 },
  { column: 'interp_d27', name: 'D27 Bhamsa chart — strength, natural vitality, innate gifts, and pranic resources',       wordCap: 1500 },
  { column: 'interp_d30', name: 'D30 Trimsamsa chart — misfortune, suffering, karmic difficulty, and loss patterns',       wordCap: 1500 },
  { column: 'interp_d40', name: 'D40 Khavedamsa chart — auspicious and inauspicious planetary influences at fine scale',   wordCap: 1500 },
  { column: 'interp_d45', name: 'D45 Akshavedamsa chart — overall life quality across all domains at the 45th scale',      wordCap: 1500 },
  { column: 'interp_d60', name: 'D60 Shastiamsa chart — past life karma, fate, deep soul imprints, and karmic debt',      wordCap: 1500 },
]

// ─── Layer 1 — Payload stripper ───────────────────────────────────────────────
//
// Astrology sections must never receive HD data.
// Two sources of contamination in the natal payload:
//   1. chart_json.hd — full HD chart object
//   2. chart_json.natal.karmic_gate_overlay — HD gate data embedded in natal response
//
// Both are stripped here. Built once above the loop — not per section.

function buildAstrologyPayload(chartJson: unknown): unknown {
  const payload = JSON.parse(JSON.stringify(chartJson)) as Record<string, unknown>

  // Strip full HD chart
  if ('hd' in payload) delete payload.hd

  // Strip karmic_gate_overlay from natal — contains raw HD gate numbers,
  // channel status, and electromagnetic flags
  const natal = payload.natal as Record<string, unknown> | undefined
  if (natal && 'karmic_gate_overlay' in natal) {
    delete natal.karmic_gate_overlay
  }

  return payload
}

// ─── Layer 2 — Identity stripper ─────────────────────────────────────────────
//
// CLAUDE_CORE.md contains two distinct blocks:
//   1. ## SYSTEM IDENTITY — declares three-system expert operating simultaneously
//      across Jyotish, HD, and Gene Keys. This is the contamination source.
//   2. Everything else — voice rules, tier architecture, psychological frameworks,
//      hard rules, session protocol, output formatting. These are needed.
//
// For discipline-specific sections, strip ## SYSTEM IDENTITY entirely.
// Voice and tier rules remain intact.

function extractVoiceAndTierRules(coreDoc: string): string {
  return coreDoc.replace(
    /## SYSTEM IDENTITY[\s\S]*?(?=## TIER ARCHITECTURE)/,
    ''
  )
}

// ─── Aspect extraction ────────────────────────────────────────────────────────

function getAspectPartners(chartJson: unknown, planetKey: string): string[] {
  try {
    const natal = (chartJson as Record<string, unknown>)?.natal as Record<string, unknown>
    const natalAspects = natal?.natal_aspects as Record<string, unknown>
    if (!natalAspects) return []

    if (planetKey === 'Lagna') {
      const lagnaAspects = natalAspects.lagna_aspects as Array<Record<string, unknown>> ?? []
      return [...new Set(
        lagnaAspects
          .map(a => String(a.planet ?? '').trim())
          .filter(Boolean)
      )]
    }

    const aspects = natalAspects.aspects as Array<Record<string, unknown>> ?? []
    const partners: string[] = []
    const key = planetKey.toLowerCase()

    for (const asp of aspects) {
      const p1 = String(asp.planet1 ?? '').trim()
      const p2 = String(asp.planet2 ?? '').trim()
      if (p1.toLowerCase() === key) partners.push(p2)
      else if (p2.toLowerCase() === key) partners.push(p1)
    }

    return [...new Set(partners.filter(Boolean))]
  } catch {
    return []
  }
}

// ─── Layer 3 + User message builder ──────────────────────────────────────────
//
// Every astrology section user message opens with a hard discipline declaration.
// This is the final gate — even if layers 1 and 2 somehow fail, the model
// receives an explicit instruction forbidding HD content in this section.

function buildUserMessage(
  section: SectionDef,
  chartJsonStr: string,
  chartJson: unknown
): string {
  // Layer 3 — explicit discipline declaration
  const disciplineDeclaration =
    'This is a Sidereal Lahiri Jyotish section. ' +
    'There is no Human Design data in this payload. ' +
    'Do not reference gates, channels, centers, Incarnation Cross, type, profile, ' +
    'authority, variables, or any Human Design mechanic anywhere in this section. ' +
    'Do not reference Gene Keys, Shadow, Gift, Siddhi, or any Gene Keys language ' +
    'anywhere in this section. ' +
    'Interpret using classical Jyotish mechanics only.\n\n'

  // Scope block — planet-specific or section-specific
  let scopeBlock: string
  if (section.planetKey) {
    const partners = getAspectPartners(chartJson, section.planetKey)
    const aspectLine = partners.length > 0
      ? `The only other planets you may name are those that directly aspect ${section.planetKey} within 5° orb in the natal_aspects field: ${partners.join(', ')}. Every other planet is out of scope for this section.`
      : `${section.planetKey} has no planets within 5° orb in natal_aspects. Do not name any other planet in this section.`

    scopeBlock =
      `Interpret ${section.name} only. ` +
      `Cover exactly and only: this planet's classical Jyotish significations, ` +
      `its rashi (sign) and what that sign means for this planet, ` +
      `its bhava (house) and the BPHS significations of that house, ` +
      `its nakshatra and pada, its dignity, its retrograde status, ` +
      `and any graha drishti or degree-based aspects it receives or casts. ` +
      `${aspectLine} ` +
      `Do not reference any other chart placement, house, or planet outside that scope.`
  } else {
    scopeBlock =
      `Interpret ${section.name} only. ` +
      `Read only the chart data fields directly relevant to ${section.name}. ` +
      `Do not bring in planetary placements or house themes that belong to other sections.`
  }

  return (
    disciplineDeclaration +
    `Here is the complete chart data:\n\n${chartJsonStr}\n\n` +
    scopeBlock +
    ` Speak directly to this person in second person, present tense. ` +
    `No bullet points. No markdown. No asterisks. No em dashes. ` +
    `No hedging language. No textbook definitions. ` +
    `Write up to ${section.wordCap} words. Do not exceed ${section.wordCap} words.`
  )
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = await request.json()
  const { chart_json, tier, chart_id, skip_columns } = body as {
    chart_json: unknown
    tier: number
    chart_id: string
    skip_columns?: string[]
  }

  const skipSet = new Set(Array.isArray(skip_columns) ? skip_columns : [])

  const chartJsonStr = JSON.stringify(chart_json, null, 2)

  if (!chart_json || chartJsonStr === 'null') {
    return new Response(JSON.stringify({ error: 'No chart data received' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Fetch governing documents in parallel
  const [systemDoc, coreDoc, astroDoc] = await Promise.all([
    fetch(ASTRO_DOC_URLS.system).then(r => r.text()),
    fetch(ASTRO_DOC_URLS.core).then(r => r.text()),
    fetch(ASTRO_DOC_URLS.astro).then(r => r.text()),
  ])

  // Assemble session config from CLAUDE_SYSTEM.md
  let systemDoc_configured = systemDoc
  systemDoc_configured = systemDoc_configured.replace('[TIER_1 / TIER_2 / TIER_3]', `TIER_${tier}`)
  systemDoc_configured = systemDoc_configured.replace('[USER_NAME]', user.email ?? 'User')
  systemDoc_configured = systemDoc_configured.replace('[TRUE / FALSE]', 'FALSE')
  systemDoc_configured = systemDoc_configured.replace(/\[CHART_JSON[^\]]*\]/g, 'Provided in the conversation turn.')
  systemDoc_configured = systemDoc_configured.replace(/\[INTAKE_JSON[^\]]*\]/g, 'N/A')
  systemDoc_configured = systemDoc_configured.replace(/\[CHART_JSON_B[^\]]*\]/g, 'N/A')

  // Layer 2 — Astrology system prompt:
  //   CLAUDE_SYSTEM.md (session config)
  //   + CLAUDE_CORE.md voice/tier rules with three-system identity block stripped
  //   + CLAUDE_ASTRO.md (full astrology rules)
  //
  // The model receives voice rules, tier enforcement, psychological frameworks,
  // and hard rules — but NOT the three-system identity declaration.
  const astrologySystemPrompt = [
    systemDoc_configured,
    '\n\n---\n\n',
    extractVoiceAndTierRules(coreDoc),
    '\n\n---\n\n',
    astroDoc,
  ].join('')

  console.log(
    `[interpret] astrology system prompt assembled — ${astrologySystemPrompt.length} chars | ` +
    `${SECTIONS.length} sections | chart_id=${chart_id}`
  )

  // Layer 1 — Strip HD data from astrology payload.
  // Built once here — not rebuilt per section.
  // Removes: chart_json.hd and chart_json.natal.karmic_gate_overlay
  const astrologyPayload = buildAstrologyPayload(chart_json)
  const astrologyPayloadStr = JSON.stringify(astrologyPayload, null, 2)

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const adminSupabase = createAdminClient()
  const encoder = new TextEncoder()

  // SSE stream — connection stays alive during sequential generation
  const readable = new ReadableStream({
    async start(controller) {
      function send(payload: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      const completed: string[] = []
      const sectionsToRun = SECTIONS.filter(s => !skipSet.has(s.column))

      for (const section of sectionsToRun) {
        console.log(`[interpret] generating ${section.column}`)

        try {
          // Layer 1: stripped payload
          // Layer 2: astrology-only system prompt (identity block removed)
          // Layer 3: discipline declaration prepended in buildUserMessage
          const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            temperature: 0.3,
            system: astrologySystemPrompt,
            messages: [
              {
                role: 'user',
                content: buildUserMessage(section, astrologyPayloadStr, astrologyPayload),
              },
            ],
          })

          const text = message.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map(b => b.text)
            .join('')

          if (chart_id && text) {
            const { error: dbError } = await adminSupabase
              .from('charts')
              .update({
                [section.column]: text,
                updated_at: new Date().toISOString(),
              })
              .eq('id', chart_id)

            if (dbError) {
              console.error(`[interpret] db write failed for ${section.column}:`, dbError)
            }
          }

          completed.push(section.column)
          console.log(`[interpret] ${section.column} done — ${text.length} chars`)
          send({ column: section.column, status: 'done', chars: text.length })

        } catch (err) {
          console.error(`[interpret] ${section.column} failed:`, err)
          send({ column: section.column, status: 'error', error: String(err) })
        }
      }

      send({ done: true, completed, total: SECTIONS.length, skipped: Array.from(skipSet) })
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
