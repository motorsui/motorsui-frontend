import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { postProcess } from '@/lib/interpret/post-process'

// ─── Governing documents ──────────────────────────────────────────────────────
//
// HD sections receive: CLAUDE_SYSTEM.md + CLAUDE_CORE_HD.md (self-contained)
// Astrology docs are NOT loaded. HD payload contains only hd + birth data.
// Three contamination layers mirror the astrology route, reversed:
//   Layer 1 — Payload: strip natal astrology from chart_json before sending
//   Layer 2 — System prompt: CLAUDE_ASTRO.md not included; CLAUDE_CORE_HD.md loaded directly
//   Layer 3 — User message: hard discipline declaration forbidding Jyotish content

const DOC_BASE = 'https://raw.githubusercontent.com/motorsui/motorsui-chart-api/main'

const HD_DOC_URLS = {
  system: `${DOC_BASE}/CLAUDE_SYSTEM.md`,
  core:   `${DOC_BASE}/CLAUDE_CORE_HD.md`,
}

// ─── Fixed section definitions ────────────────────────────────────────────────

interface HDSectionDef {
  column:  string
  name:    string
  wordCap: number
}

const HD_FIXED_SECTIONS: HDSectionDef[] = [
  {
    column:  'hd_type_strategy_authority',
    name:    'Type, Strategy, and Authority — what this person\'s energy type is, how they are designed to initiate or respond, and which inner signal they can trust for correct decisions',
    wordCap: 500,
  },
  {
    column:  'hd_profile',
    name:    'Profile — the conscious and unconscious lines, their combined archetypal role, how they shape relationships, the life path, and the relational field this person naturally occupies',
    wordCap: 1000,
  },
  {
    column:  'hd_incarnation_cross',
    name:    'Incarnation Cross — the four-gate purpose structure (Personality Sun, Personality Earth, Design Sun, Design Earth), the geometry (Right Angle, Left Angle, or Juxtaposition), the quarter theme, and the specific life purpose narrative this cross describes for this person',
    wordCap: 2000,
  },
  {
    column:  'hd_definition',
    name:    'Definition — Single, Split, Triple Split, or Quadruple Split: which centers are connected into each defined area, what this configuration produces energetically, and for Split definition specifically: which bridge gates exist, where the split occurs, and what those bridge gates condition in the person',
    wordCap: 800,
  },
  {
    column:  'hd_center_head',
    name:    'Head Center — whether it is defined or undefined in this chart, its consistent or conditional expression of mental pressure and inspiration, the not-self question if undefined, and what this center\'s state produces for this specific person',
    wordCap: 500,
  },
  {
    column:  'hd_center_ajna',
    name:    'Ajna Center — whether defined or undefined, its consistent or conditional expression of conceptualization and opinion formation, the not-self question if undefined, and what this center\'s state produces for this specific person',
    wordCap: 500,
  },
  {
    column:  'hd_center_throat',
    name:    'Throat Center — whether defined or undefined, its consistent or conditional expression of communication and manifestation, which gates are active in it, the not-self question if undefined, and what this center\'s state produces for this specific person',
    wordCap: 500,
  },
  {
    column:  'hd_center_g',
    name:    'G Center — whether defined or undefined, its consistent or conditional expression of identity, direction, and magnetic field, the not-self question if undefined, and what this center\'s state produces for this specific person\'s sense of self and love',
    wordCap: 500,
  },
  {
    column:  'hd_center_heart',
    name:    'Heart/Ego Center — whether defined or undefined, its consistent or conditional expression of willpower, material world engagement, and promises, the not-self question if undefined, and what this center\'s state produces around self-worth and follow-through',
    wordCap: 500,
  },
  {
    column:  'hd_center_sacral',
    name:    'Sacral Center — whether defined or undefined, its consistent or conditional expression of life force, work energy, and response, the not-self question if undefined, and what this center\'s state means for how this person generates and sustains energy',
    wordCap: 500,
  },
  {
    column:  'hd_center_solar_plexus',
    name:    'Solar Plexus Center — whether defined or undefined, its consistent or conditional expression of the emotional wave, truth, and desire, the authority implications if defined, the not-self question if undefined, and what this center\'s state produces for emotional clarity',
    wordCap: 500,
  },
  {
    column:  'hd_center_spleen',
    name:    'Spleen Center — whether defined or undefined, its consistent or conditional expression of intuition, immune awareness, and spontaneous knowing, the not-self question if undefined, and what this center\'s state produces for body wisdom and health',
    wordCap: 500,
  },
  {
    column:  'hd_center_root',
    name:    'Root Center — whether defined or undefined, its consistent or conditional expression of adrenaline, stress response, and evolutionary drive, the not-self question if undefined, and what this center\'s state means for how this person relates to pressure',
    wordCap: 500,
  },
  {
    column:  'hd_variables',
    name:    'Variables — all four transformations: Determination (how this person should take in food and process information), Environment (the physical environment conditions this person needs), Perspective (how this person is designed to take in the world — peripheral or focused), and Motivation (what authentically drives their decisions)',
    wordCap: 1600,
  },
  {
    column:  'hd_shadow_gates',
    name:    'Shadow Gates — all active Fear Gates (the seven Spleen center awareness gates: 18, 28, 32, 44, 48, 50, 57) present in this chart and what each produces, plus any active Individual circuit Melancholy Gates (the 24 Individual circuit gates) and how they create the melancholic wave in this person',
    wordCap: 800,
  },
  {
    column:  'hd_circuits',
    name:    'Circuit Map — which of the three main circuits (Tribal, Individual, Collective) and their sub-circuits are active in this design through defined channels, how they interact when more than one is active, and what the overall circuit profile produces for how this person relates, creates, and contributes',
    wordCap: 600,
  },
  {
    column:  'hd_timing_events',
    name:    'Timing Events — Saturn Return, Uranus Opposition, Chiron Return, and Second Saturn Return: the exact dates for this person, and what each of these transits means in Human Design terms for this specific chart\'s life arc and deconditioning process',
    wordCap: 1200,
  },
]

// ─── Layer 1 — HD payload builder ────────────────────────────────────────────
//
// HD sections receive only hd data + birth context.
// Natal astrology data is excluded — prevents Jyotish contamination of HD sections.

function buildHDPayload(chartJson: unknown): unknown {
  const json = chartJson as Record<string, unknown>
  return {
    hd:    json.hd,
    birth: json.birth,
  }
}

// ─── Channel extractor ────────────────────────────────────────────────────────

function extractDefinedChannels(hdData: unknown): Array<{key: string; name: string}> {
  const hd = hdData as Record<string, unknown>
  const raw = (hd?.channels ?? hd?.defined_channels ?? []) as Array<Record<string, unknown>>
  return raw
    .map(ch => ({
      key:  String(ch.channel ?? ch.id ?? ''),
      name: String(ch.name   ?? ch.channel ?? ''),
    }))
    .filter(ch => ch.key !== '')
}

// ─── Gate extractor ───────────────────────────────────────────────────────────
// Returns all unique active gates across Personality + Design columns.

function extractActiveGates(hdData: unknown): Array<{key: string}> {
  const hd = hdData as Record<string, unknown>
  const gateSet = new Set<number>()

  const gatesField  = hd?.gates as Record<string, unknown> | undefined
  const personality = (gatesField?.personality ?? hd?.personality_gates ?? []) as Array<Record<string, unknown>>
  const design      = (gatesField?.design       ?? hd?.design_gates      ?? []) as Array<Record<string, unknown>>
  const allFlat     = (hd?.all_gates            ?? [])                           as Array<Record<string, unknown>>

  for (const g of [...personality, ...design, ...allFlat]) {
    const num = Number(g.gate ?? g.number ?? g.id ?? 0)
    if (num >= 1 && num <= 64) gateSet.add(num)
  }

  return Array.from(gateSet)
    .sort((a, b) => a - b)
    .map(n => ({ key: String(n) }))
}

// ─── Self-review footer ───────────────────────────────────────────────────────

const SELF_REVIEW =
  'As you write each sentence: if you use an em dash (—), replace it immediately with a ' +
  'comma or restructure the sentence. If you use "is not" or "are not", rewrite as an ' +
  'affirmative statement before continuing.'

// ─── Layer 3 + User message builder ──────────────────────────────────────────

function buildHDUserMessage(name: string, hdPayloadStr: string, wordCap: number): string {
  // Layer 3 — discipline declaration: hard gate against Jyotish contamination
  const disciplineDeclaration =
    'This is a Human Design section. Jovian Archive mechanics only. ' +
    'This payload contains Human Design chart data and birth data. ' +
    'Do not reference Jyotish astrology, nakshatras, dashas, yogas, rashis, bhavas, ' +
    'planetary dignities, Rahu/Ketu as Jyotish nodes, or any Jyotish mechanic. ' +
    'Interpret using Human Design mechanics from the Jovian Archive only.\n\n'

  return (
    disciplineDeclaration +
    `Here is the complete chart data:\n\n${hdPayloadStr}\n\n` +
    `Interpret ${name} only. ` +
    `Do not reference mechanics or data that belong to other sections. ` +
    `Speak directly to this person in second person, present tense. ` +
    `No bullet points. No markdown. No asterisks. No em dashes. ` +
    `No hedging language. No textbook definitions. ` +
    SELF_REVIEW + ' ' +
    `Write up to ${wordCap} words. Do not exceed ${wordCap} words.`
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
  const { chart_json, tier, chart_id, skip_columns, intake_json } = body as {
    chart_json:    unknown
    tier:          number
    chart_id:      string
    skip_columns?: string[]
    intake_json?:  Record<string, string> | null
  }

  const skipSet = new Set(Array.isArray(skip_columns) ? skip_columns : [])

  if (!chart_json) {
    return new Response(JSON.stringify({ error: 'No chart data received' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Fetch governing documents in parallel
  const [systemDoc, coreDoc] = await Promise.all([
    fetch(HD_DOC_URLS.system).then(r => r.text()),
    fetch(HD_DOC_URLS.core).then(r => r.text()),
  ])

  // Configure system doc placeholders
  let systemDoc_configured = systemDoc
  systemDoc_configured = systemDoc_configured.replace('[TIER_1 / TIER_2 / TIER_3]', `TIER_${tier}`)
  systemDoc_configured = systemDoc_configured.replace('[USER_NAME]', user.email ?? 'User')
  systemDoc_configured = systemDoc_configured.replace('[TRUE / FALSE]', 'FALSE')
  systemDoc_configured = systemDoc_configured.replace(/\[CHART_JSON[^\]]*\]/g, 'Provided in the conversation turn.')
  systemDoc_configured = systemDoc_configured.replace(
    /\[INTAKE_JSON[^\]]*\]/g,
    intake_json ? JSON.stringify(intake_json, null, 2) : 'Not provided'
  )
  systemDoc_configured = systemDoc_configured.replace(/\[CHART_JSON_B[^\]]*\]/g, 'N/A')

  // Layer 2 — HD system prompt:
  //   CLAUDE_SYSTEM.md (session config) + CLAUDE_CORE_HD.md (self-contained HD engine)
  const hdSystemPrompt = [
    systemDoc_configured,
    '\n\n---\n\n',
    coreDoc,
  ].join('')

  console.log(
    `[interpret-hd] system prompt assembled — ${hdSystemPrompt.length} chars | chart_id=${chart_id}`
  )

  // Layer 1 — Strip astrology data from HD payload
  const hdPayload    = buildHDPayload(chart_json)
  const hdPayloadStr = JSON.stringify(hdPayload, null, 2)

  // Extract variable sections from chart data
  const hdData   = (chart_json as Record<string, unknown>)?.hd
  const channels = extractDefinedChannels(hdData)
  const gates    = extractActiveGates(hdData)

  console.log(
    `[interpret-hd] ${HD_FIXED_SECTIONS.length} fixed sections | ` +
    `${channels.length} channels | ${gates.length} gates`
  )

  const anthropic    = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const adminSupabase = createAdminClient()
  const encoder       = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      function send(payload: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      const completed:      string[]          = []
      const channelResults: Map<string, string> = new Map()
      const gateResults:    Map<string, string> = new Map()

      // ─── Fixed sections ──────────────────────────────────────────────
      for (const section of HD_FIXED_SECTIONS) {
        if (skipSet.has(section.column)) continue
        console.log(`[interpret-hd] generating ${section.column}`)

        try {
          const message = await anthropic.messages.create({
            model:       'claude-sonnet-4-6',
            max_tokens:  4096,
            temperature: 0.3,
            system:      hdSystemPrompt,
            messages: [{
              role:    'user',
              content: buildHDUserMessage(section.name, hdPayloadStr, section.wordCap),
            }],
          })

          const raw = message.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map(b => b.text)
            .join('')

          const text = await postProcess(raw, anthropic, section.column)

          if (chart_id && text) {
            const { error: dbError } = await adminSupabase
              .from('charts')
              .update({ [section.column]: text, updated_at: new Date().toISOString() })
              .eq('id', chart_id)
            if (dbError) console.error(`[interpret-hd] db write failed for ${section.column}:`, dbError)
          }

          completed.push(section.column)
          console.log(`[interpret-hd] ${section.column} done — ${text.length} chars`)
          send({ column: section.column, status: 'done', chars: text.length })

        } catch (err) {
          console.error(`[interpret-hd] ${section.column} failed:`, err)
          send({ column: section.column, status: 'error', error: String(err) })
        }
      }

      // ─── Channel sections (variable) ─────────────────────────────────
      // Written to hd_channels JSONB column, keyed by channel string e.g. "2-14"
      for (const ch of channels) {
        const colKey = `channel_${ch.key.replace('-', '_')}`
        if (skipSet.has(colKey)) continue

        const name =
          `Channel ${ch.key}${ch.name && ch.name !== ch.key ? ` — ${ch.name}` : ''}: ` +
          'circuit classification, consistent energy it produces in this person\'s design, ' +
          'healthy aligned expression, not-self distortion under conditioning, and somatic body experience'

        console.log(`[interpret-hd] generating channel ${ch.key}`)

        try {
          const message = await anthropic.messages.create({
            model:       'claude-sonnet-4-6',
            max_tokens:  4096,
            temperature: 0.3,
            system:      hdSystemPrompt,
            messages: [{
              role:    'user',
              content: buildHDUserMessage(name, hdPayloadStr, 1200),
            }],
          })

          const text = message.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map(b => b.text)
            .join('')

          const channelRaw = message.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map(b => b.text)
            .join('')

          const channelText = await postProcess(channelRaw, anthropic, colKey)

          if (channelText) {
            channelResults.set(ch.key, channelText)
            if (chart_id) {
              const { error: dbError } = await adminSupabase
                .from('charts')
                .update({
                  hd_channels:  Object.fromEntries(channelResults),
                  updated_at:   new Date().toISOString(),
                })
                .eq('id', chart_id)
              if (dbError) console.error(`[interpret-hd] db write failed for channel ${ch.key}:`, dbError)
            }
          }

          completed.push(colKey)
          console.log(`[interpret-hd] channel ${ch.key} done — ${channelText.length} chars`)
          send({ column: colKey, status: 'done', chars: text.length })

        } catch (err) {
          console.error(`[interpret-hd] channel ${ch.key} failed:`, err)
          send({ column: colKey, status: 'error', error: String(err) })
        }
      }

      // ─── Gate sections (variable) ─────────────────────────────────────
      // Written to hd_gates JSONB column, keyed by gate number string e.g. "58"
      for (const gate of gates) {
        const colKey = `gate_${gate.key}`
        if (skipSet.has(colKey)) continue

        const name =
          `Gate ${gate.key} as it appears in this person's chart: ` +
          'whether Personality (conscious), Design (unconscious), or both columns; ' +
          'its line number and what that line produces behaviorally; ' +
          'its perceptual gift and shadow expression; ' +
          'and how it contributes to this person\'s overall design'

        console.log(`[interpret-hd] generating gate ${gate.key}`)

        try {
          const message = await anthropic.messages.create({
            model:       'claude-sonnet-4-6',
            max_tokens:  2048,
            temperature: 0.3,
            system:      hdSystemPrompt,
            messages: [{
              role:    'user',
              content: buildHDUserMessage(name, hdPayloadStr, 800),
            }],
          })

          const text = message.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map(b => b.text)
            .join('')

          const gateRaw = message.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map(b => b.text)
            .join('')

          const gateText = await postProcess(gateRaw, anthropic, colKey)

          if (gateText) {
            gateResults.set(gate.key, gateText)
            if (chart_id) {
              const { error: dbError } = await adminSupabase
                .from('charts')
                .update({
                  hd_gates:   Object.fromEntries(gateResults),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', chart_id)
              if (dbError) console.error(`[interpret-hd] db write failed for gate ${gate.key}:`, dbError)
            }
          }

          completed.push(colKey)
          console.log(`[interpret-hd] gate ${gate.key} done — ${gateText.length} chars`)
          send({ column: colKey, status: 'done', chars: text.length })

        } catch (err) {
          console.error(`[interpret-hd] gate ${gate.key} failed:`, err)
          send({ column: colKey, status: 'error', error: String(err) })
        }
      }

      const totalSections = HD_FIXED_SECTIONS.length + channels.length + gates.length
      send({
        done:      true,
        completed,
        total:     totalSections,
        channels:  channels.map(c => c.key),
        gates:     gates.map(g => g.key),
        skipped:   Array.from(skipSet),
      })
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
