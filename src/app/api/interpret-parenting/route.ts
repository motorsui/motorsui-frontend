import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { postProcess } from '@/lib/interpret/post-process'

// ─── Governing documents ──────────────────────────────────────────────────────
//
// Parenting by Astrology sections receive:
//   CLAUDE_SYSTEM.md + CLAUDE_CORE_ASTRO_PARENTING.md + CLAUDE_NATAL_PARENTING.md
//
// CLAUDE_ASTRO.md is NOT loaded separately.
// HD data is stripped from the payload (Layer 1).

const DOC_BASE = 'https://raw.githubusercontent.com/motorsui/motorsui-chart-api/main'

const PARENTING_DOC_URLS = {
  system:    `${DOC_BASE}/CLAUDE_SYSTEM.md`,
  core:      `${DOC_BASE}/CLAUDE_CORE_ASTRO_PARENTING.md`,
  parenting: `${DOC_BASE}/CLAUDE_NATAL_PARENTING.md`,
}

// ─── Section definitions ──────────────────────────────────────────────────────

interface SectionDef {
  column:     string
  name:       string
  planetKey?: string
  wordCap:    number
  maxTokens?: number
}

const SECTIONS: SectionDef[] = [
  { column: 'parenting_lagna',        name: 'Lagna, Lagna Lord, and Lagna Nakshatra & Pada', planetKey: 'Lagna',     wordCap: 1500 },
  { column: 'parenting_sun',          name: 'Sun placement',                                  planetKey: 'Sun',       wordCap: 1500 },
  { column: 'parenting_moon',         name: 'Moon placement',                                 planetKey: 'Moon',      wordCap: 1500 },
  { column: 'parenting_mercury',      name: 'Mercury placement',                              planetKey: 'Mercury',   wordCap: 1500 },
  { column: 'parenting_venus',        name: 'Venus placement',                                planetKey: 'Venus',     wordCap: 1500 },
  { column: 'parenting_mars',         name: 'Mars placement',                                 planetKey: 'Mars',      wordCap: 1500 },
  { column: 'parenting_jupiter',      name: 'Jupiter placement',                              planetKey: 'Jupiter',   wordCap: 1500 },
  { column: 'parenting_saturn',       name: 'Saturn placement',                               planetKey: 'Saturn',    wordCap: 1500 },
  { column: 'parenting_uranus',       name: 'Uranus placement',                               planetKey: 'Uranus',    wordCap: 1200 },
  { column: 'parenting_neptune',      name: 'Neptune placement',                              planetKey: 'Neptune',   wordCap: 1200 },
  { column: 'parenting_pluto',        name: 'Pluto placement',                                planetKey: 'Pluto',     wordCap: 1200 },
  { column: 'parenting_rahu',         name: 'Rahu placement',                                 planetKey: 'NorthNode', wordCap: 1500 },
  { column: 'parenting_ketu',         name: 'Ketu placement',                                 planetKey: 'SouthNode', wordCap: 1500 },
  { column: 'parenting_dignities',    name: 'all planetary dignities',                                                 wordCap: 1000 },
  { column: 'parenting_purusharthas', name: 'Purusharthas',                                                            wordCap:  800 },
  { column: 'parenting_dasha',        name: 'Dasha Timeline',                                                          wordCap: 4000, maxTokens: 8192 },
]

// ─── Self-review footer ───────────────────────────────────────────────────────
// Appended to every user message. Fires at generation time.

const SELF_REVIEW =
  'As you write each sentence: if you use an em dash (—), replace it immediately with a ' +
  'comma or restructure the sentence. If you use "is not" or "are not", rewrite as an ' +
  'affirmative statement before continuing.'

// ─── Layer 1 — Payload stripper ───────────────────────────────────────────────

function buildParentingPayload(chartJson: unknown): unknown {
  const payload = JSON.parse(JSON.stringify(chartJson)) as Record<string, unknown>
  if ('hd' in payload) delete payload.hd
  const natal = payload.natal as Record<string, unknown> | undefined
  if (natal && 'karmic_gate_overlay' in natal) delete natal.karmic_gate_overlay
  return payload
}

// ─── Aspect extraction ────────────────────────────────────────────────────────

function getAspectPartners(chartJson: unknown, planetKey: string): string[] {
  try {
    const natal       = (chartJson as Record<string, unknown>)?.natal as Record<string, unknown>
    const natalAspects = natal?.natal_aspects as Record<string, unknown>
    if (!natalAspects) return []

    if (planetKey === 'Lagna') {
      const lagnaAspects = natalAspects.lagna_aspects as Array<Record<string, unknown>> ?? []
      return [...new Set(lagnaAspects.map(a => String(a.planet ?? '').trim()).filter(Boolean))]
    }

    const aspects  = natalAspects.aspects as Array<Record<string, unknown>> ?? []
    const partners: string[] = []
    const key      = planetKey.toLowerCase()

    for (const asp of aspects) {
      const p1 = String(asp.planet1 ?? '').trim()
      const p2 = String(asp.planet2 ?? '').trim()
      if (p1.toLowerCase() === key) partners.push(p2)
      else if (p2.toLowerCase() === key) partners.push(p1)
    }

    return [...new Set(partners.filter(Boolean))]
  } catch { return [] }
}

// ─── Layer 3 — Standard user message builder ─────────────────────────────────

function buildUserMessage(
  section: SectionDef,
  chartJsonStr: string,
  chartJson: unknown
): string {
  const disciplineDeclaration =
    'This is a Sidereal Lahiri Jyotish parenting section. ' +
    'The subject is a child. Address the parent throughout — "your child", "they", "their". ' +
    'There is no Human Design data in this payload. ' +
    'Do not reference gates, channels, centers, Incarnation Cross, type, profile, ' +
    'authority, variables, or any Human Design mechanic anywhere in this section. ' +
    'Do not reference Gene Keys, Shadow, Gift, Siddhi, or any Gene Keys language. ' +
    'Interpret using classical Jyotish mechanics only, filtered through the parenting lens.\n\n'

  let scopeBlock: string
  if (section.planetKey) {
    const partners  = getAspectPartners(chartJson, section.planetKey)
    const aspectLine = partners.length > 0
      ? `The only other planets you may name are those that directly aspect ${section.planetKey} within 5° orb in the natal_aspects field: ${partners.join(', ')}. Every other planet is out of scope for this section.`
      : `${section.planetKey} has no planets within 5° orb in natal_aspects. Do not name any other planet in this section.`

    scopeBlock =
      `Interpret ${section.name} only through the parenting lens. ` +
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
    ` Address the parent in second person, present tense. ` +
    `No bullet points. No markdown. No asterisks. No em dashes. ` +
    `No hedging language. No textbook definitions. ` +
    SELF_REVIEW + ' ' +
    `Write up to ${section.wordCap} words. Do not exceed ${section.wordCap} words.`
  )
}

// ─── 4a. Dasha Template message builder ──────────────────────────────────────

function buildDashaUserMessage(chartJsonStr: string): string {
  return (
    'This is a Sidereal Lahiri Jyotish parenting section. ' +
    'The subject is a child. Address the parent throughout — "your child", "they", "their". ' +
    'There is no Human Design data in this payload. ' +
    'Interpret using classical Jyotish mechanics only, filtered through the parenting lens.\n\n' +
    `Here is the complete chart data:\n\n${chartJsonStr}\n\n` +
    'Write the Dasha Timeline. Follow this exact hierarchical structure — do not flatten it:\n\n' +
    '**CURRENT MAHADASHA NAME** (dates)\n' +
    '300 words on the overall quality and themes of this Mahadasha as a parenting chapter.\n\n' +
    'Current Antardasha: NAME (dates)\n' +
    '400 words on what is active right now for this child.\n\n' +
    'Next Antardasha: NAME (dates)\n' +
    '400 words on what is coming next.\n\n' +
    'Each remaining Antardasha within the current Mahadasha: NAME (dates)\n' +
    '150 words each. Continue until the current Mahadasha ends.\n\n' +
    '**NEXT MAHADASHA NAME** (dates)\n' +
    '300 words on the themes of this next major chapter.\n\n' +
    'Each Antardasha within the next Mahadasha: NAME (dates)\n' +
    '150 words each. Stop when the child reaches age 30.\n\n' +
    'If a third Mahadasha begins before age 30, follow the same pattern: ' +
    '300 words for the Mahadasha, 150 words for each Antardasha until age 30.\n\n' +
    'Rules: Never cover periods past age 30. Mahadasha headings are bold and all-caps. ' +
    'Antardasha entries are subcategories beneath their Mahadasha — never elevated to the same level. ' +
    'Present tense throughout. No bullet points. No em dashes. ' +
    '"Is not" and "are not" are forbidden — rewrite as affirmative statements immediately. ' +
    SELF_REVIEW + ' ' +
    'Write up to 4000 words. Do not exceed 4000 words.'
  )
}

// ─── 4b. Purusharthas Template message builder ───────────────────────────────

function buildPurusharthasUserMessage(chartJsonStr: string): string {
  return (
    'This is a Sidereal Lahiri Jyotish parenting section. ' +
    'The subject is a child. Address the parent throughout — "your child", "they", "their". ' +
    'There is no Human Design data in this payload. ' +
    'Interpret using classical Jyotish mechanics only, filtered through the parenting lens.\n\n' +
    `Here is the complete chart data:\n\n${chartJsonStr}\n\n` +
    'Write the Dharma, Artha, Kama, Moksha section. Follow this exact format:\n\n' +
    'Order the four aims from highest percentage to lowest based on the chart data. ' +
    'Never use a fixed Dharma/Artha/Kama/Moksha sequence regardless of what the chart shows. ' +
    'Each sub-section heading uses percentage and planet list only — the aim name may appear ' +
    'in the prose on first mention but never as a standalone bold header.\n\n' +
    'Format (example with placeholder values):\n' +
    '44% — Sun, Moon, Venus, Ketu\n' +
    '[Prose covering this aim and what it means for this child through the parenting lens.]\n\n' +
    '31% — Mars, Saturn\n' +
    '[Prose.]\n\n' +
    'Continue for all four aims in descending percentage order.\n\n' +
    'Address the parent in second person, present tense. No bullet points. No markdown. ' +
    'No em dashes. "Is not" and "are not" are forbidden — rewrite as affirmative statements. ' +
    SELF_REVIEW + ' ' +
    'Write up to 800 words. Do not exceed 800 words.'
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
    chart_json:    unknown
    tier:          number
    chart_id:      string
    skip_columns?: string[]
  }

  const skipSet      = new Set(Array.isArray(skip_columns) ? skip_columns : [])
  const chartJsonStr = JSON.stringify(chart_json, null, 2)

  if (!chart_json || chartJsonStr === 'null') {
    return new Response(JSON.stringify({ error: 'No chart data received' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const [systemDoc, coreDoc, parentingDoc] = await Promise.all([
    fetch(PARENTING_DOC_URLS.system).then(r => r.text()),
    fetch(PARENTING_DOC_URLS.core).then(r => r.text()),
    fetch(PARENTING_DOC_URLS.parenting).then(r => r.text()),
  ])

  let systemDoc_configured = systemDoc
  systemDoc_configured = systemDoc_configured.replace('[TIER_1 / TIER_2 / TIER_3]', `TIER_${tier}`)
  systemDoc_configured = systemDoc_configured.replace('[USER_NAME]', user.email ?? 'User')
  systemDoc_configured = systemDoc_configured.replace('[TRUE / FALSE]', 'FALSE')
  systemDoc_configured = systemDoc_configured.replace(/\[CHART_JSON[^\]]*\]/g, 'Provided in the conversation turn.')
  systemDoc_configured = systemDoc_configured.replace(/\[INTAKE_JSON[^\]]*\]/g, 'N/A')
  systemDoc_configured = systemDoc_configured.replace(/\[CHART_JSON_B[^\]]*\]/g, 'N/A')

  const parentingSystemPrompt = [
    systemDoc_configured,
    '\n\n---\n\n',
    coreDoc,
    '\n\n---\n\n',
    parentingDoc,
  ].join('')

  console.log(
    `[interpret-parenting] system prompt assembled — ${parentingSystemPrompt.length} chars | ` +
    `${SECTIONS.length} sections | chart_id=${chart_id}`
  )

  const parentingPayload    = buildParentingPayload(chart_json)
  const parentingPayloadStr = JSON.stringify(parentingPayload, null, 2)

  const anthropic     = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const adminSupabase = createAdminClient()
  const encoder       = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      function send(payload: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      const completed:     string[] = []
      const sectionsToRun = SECTIONS.filter(s => !skipSet.has(s.column))

      for (const section of sectionsToRun) {
        console.log(`[interpret-parenting] generating ${section.column}`)

        try {
          // 4. Use section-specific template builders for dasha and Purusharthas
          const userMessage =
            section.column === 'parenting_dasha'
              ? buildDashaUserMessage(parentingPayloadStr)
              : section.column === 'parenting_purusharthas'
              ? buildPurusharthasUserMessage(parentingPayloadStr)
              : buildUserMessage(section, parentingPayloadStr, parentingPayload)

          const message = await anthropic.messages.create({
            model:       'claude-sonnet-4-6',
            max_tokens:  section.maxTokens ?? 4096,
            temperature: 0.3,
            system:      parentingSystemPrompt,
            messages: [{ role: 'user', content: userMessage }],
          })

          const raw = message.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map(b => b.text)
            .join('')

          // 1 + 2. Post-process: remove em dashes, fix "is not"/"are not"
          const text = await postProcess(raw, anthropic, section.column)

          if (chart_id && text) {
            const { error: dbError } = await adminSupabase
              .from('charts')
              .update({ [section.column]: text, updated_at: new Date().toISOString() })
              .eq('id', chart_id)
            if (dbError) console.error(`[interpret-parenting] db write failed for ${section.column}:`, dbError)
          }

          completed.push(section.column)
          console.log(`[interpret-parenting] ${section.column} done — ${text.length} chars`)
          send({ column: section.column, status: 'done', chars: text.length })

        } catch (err) {
          console.error(`[interpret-parenting] ${section.column} failed:`, err)
          send({ column: section.column, status: 'error', error: String(err) })
        }
      }

      send({ done: true, completed, total: SECTIONS.length, skipped: Array.from(skipSet) })
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
