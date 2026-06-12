import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { postProcess } from '@/lib/interpret/post-process'

// ─── Governing documents ──────────────────────────────────────────────────────
//
// HD Composite is an HD product. Uses:
//   CLAUDE_SYSTEM.md + CLAUDE_CORE_COMPOSITE.md (self-contained)
//
// CLAUDE_ASTRO.md is NOT loaded — no Jyotish content in composite sections.
// Payload contains only HD data from both persons — natal astrology stripped.
//
// Three contamination layers (reversed from astrology route):
//   Layer 1 — Payload: only { person_a: {hd, birth}, person_b: {hd, birth} }
//   Layer 2 — System prompt: no ASTRO doc; CLAUDE_CORE_COMPOSITE.md loaded directly
//   Layer 3 — User message: hard declaration forbidding Jyotish; compatibility authorized

const DOC_BASE = 'https://raw.githubusercontent.com/motorsui/motorsui-chart-api/main'

const HD_DOC_URLS = {
  system: `${DOC_BASE}/CLAUDE_SYSTEM.md`,
  core:   `${DOC_BASE}/CLAUDE_CORE_COMPOSITE.md`,
}

// ─── Channel pairs — all 35 defined HD channels ───────────────────────────────
// Used to classify composite channels as EM / dominant / compromise / friendship.

interface ChannelPair {
  a:    number
  b:    number
  name: string
}

const CHANNEL_PAIRS: ChannelPair[] = [
  { a: 1,  b: 8,  name: 'Inspiration' },
  { a: 2,  b: 14, name: 'The Beat' },
  { a: 3,  b: 60, name: 'Mutation' },
  { a: 4,  b: 63, name: 'Logic' },
  { a: 5,  b: 15, name: 'Rhythm' },
  { a: 6,  b: 59, name: 'Mating' },
  { a: 7,  b: 31, name: 'The Alpha' },
  { a: 9,  b: 52, name: 'Concentration' },
  { a: 10, b: 20, name: 'Awakening' },
  { a: 10, b: 57, name: 'Perfected Form' },
  { a: 11, b: 56, name: 'Curiosity' },
  { a: 12, b: 22, name: 'Openness' },
  { a: 13, b: 33, name: 'The Prodigal' },
  { a: 16, b: 48, name: 'The Wavelength' },
  { a: 17, b: 62, name: 'Acceptance' },
  { a: 18, b: 58, name: 'Judgment' },
  { a: 19, b: 49, name: 'Synthesis' },
  { a: 20, b: 34, name: 'Charisma' },
  { a: 20, b: 57, name: 'The Brain Wave' },
  { a: 21, b: 45, name: 'Money Line' },
  { a: 23, b: 43, name: 'Structuring' },
  { a: 24, b: 61, name: 'Awareness' },
  { a: 25, b: 51, name: 'Initiation' },
  { a: 26, b: 44, name: 'Surrender' },
  { a: 27, b: 50, name: 'Preservation' },
  { a: 28, b: 38, name: 'Struggle' },
  { a: 29, b: 46, name: 'Discovery' },
  { a: 30, b: 41, name: 'Recognition' },
  { a: 32, b: 54, name: 'Transformation' },
  { a: 34, b: 57, name: 'Power' },
  { a: 35, b: 36, name: 'Transitoriness' },
  { a: 37, b: 40, name: 'Community' },
  { a: 39, b: 55, name: 'Emoting' },
  { a: 42, b: 53, name: 'Maturation' },
  { a: 47, b: 64, name: 'Abstraction' },
]

// ─── Fixed section definitions ────────────────────────────────────────────────

interface CompSectionDef {
  column:  string
  name:    string
  wordCap: number
}

const COMPOSITE_FIXED_SECTIONS: CompSectionDef[] = [
  {
    column:  'composite_relationship_theme',
    name:    'the overall relationship theme — the single dominant energetic dynamic this composite creates between these two people: what the combined design produces that neither person carries alone, the shared frequency of the relationship field, and the central tension or gift that defines the relational arc',
    wordCap: 500,
  },
  {
    column:  'composite_profile_compatibility',
    name:    'Profile compatibility — Person A\'s Profile (both lines), Person B\'s Profile (both lines), the cross-chart line correspondences and frictions, any projection field dynamics if either carries a Line 5, the unconscious line harmony or dissonance, and what these two Profiles create together in the relational field',
    wordCap: 600,
  },
  {
    column:  'composite_type_compatibility',
    name:    'Type and Strategy compatibility — Person A\'s Type and Strategy, Person B\'s Type and Strategy, the specific not-self dynamics that can trigger between these two Types (e.g. Generator frustration, Projector bitterness, Manifestor anger), how their Strategies interact in practice, and what correct engagement between these two Types looks like in this relationship',
    wordCap: 600,
  },
  {
    column:  'composite_split_bridge',
    name:    'Split bridge dynamics — whether either person has a Split definition, what their bridge gates are, whether the other person\'s active gates close any of those bridges, what it produces energetically when a split is bridged in this relationship, and whether this creates dependency, pressure, or healing in the bridged person',
    wordCap: 600,
  },
  {
    column:  'composite_circuit_field',
    name:    'Circuit field map — which circuits (Tribal, Individual, Collective) are activated in the composite through the combined channel set, which circuit dominates the composite field, and what that dominant circuit produces for how this relationship functions socially, creatively, and in terms of shared contribution',
    wordCap: 500,
  },
  {
    column:  'composite_conditioning_triggers',
    name:    'Conditioning and not-self triggers — the specific not-self dynamics between these two people\'s defined and open centers: which defined centers in one person consistently condition the open centers of the other, what behavioral patterns and not-self responses this produces in each person, and how the conditioning flows directionally in this relationship',
    wordCap: 800,
  },
  {
    column:  'composite_group_roles',
    name:    'Penta group role coverage — which of the six Penta lines (Nourishment: gate 50, Community: gate 37, Mating: gate 59, Transformation: gate 3, Education: gate 16, Leadership: gate 23) are covered by Person A or Person B, which are uncovered, which person holds which line, whether any role is overloaded by both persons, and what the coverage gaps mean for what this relationship needs from its wider community',
    wordCap: 600,
  },
  {
    column:  'composite_ancestral_views',
    name:    'Dream and mammal view dynamics — how both persons\' unconscious design layer (dream view) and conscious personality layer (mammal view) interact in the composite, what additional channels or center definitions emerge when both persons are seen through their dream or mammal perspectives together, and what this reveals about the subconscious and somatic layer of compatibility between these two people',
    wordCap: 700,
  },
  {
    column:  'composite_gate_line_resonance',
    name:    'Gate line resonance — the shared gates between Person A and Person B, the specific line numbers each person carries in those shared gates, whether the lines are identical, correspondent, adjacent, or non-correspondent, and what the resonance or friction in these shared gate activations creates for the felt sense of recognition, attunement, and understanding between these two people',
    wordCap: 600,
  },
  {
    column:  'composite_karmic_axis',
    name:    'Karmic axis overlay — how Person A\'s Rahu, Ketu, and Saturn gate positions interact with Person B\'s Rahu, Ketu, and Saturn gate positions in the composite: whether karmic planet gates are completing channels across the two charts, any nodal axis gate inversions or reinforcements, what channels or centers are activated by karmic planet gates that would otherwise be dormant, and what this combined karmic layer reveals about the evolutionary purpose and karmic contract at the core of this relationship',
    wordCap: 1200,
  },
]

// ─── Composite channel classification ────────────────────────────────────────

interface ChannelEntry {
  key:  string
  name: string
}

interface FriendshipEntry extends ChannelEntry {
  sharedGate: number
}

interface CompositeChannels {
  em:         ChannelEntry[]
  dominantA:  ChannelEntry[]
  dominantB:  ChannelEntry[]
  compromise: ChannelEntry[]
  friendship: FriendshipEntry[]
}

function extractGateNumbers(hdData: unknown): Set<number> {
  const hd      = hdData as Record<string, unknown>
  const gateSet = new Set<number>()

  const gatesField  = hd?.gates as Record<string, unknown> | undefined
  const personality = (gatesField?.personality ?? hd?.personality_gates ?? []) as Array<Record<string, unknown>>
  const design      = (gatesField?.design       ?? hd?.design_gates      ?? []) as Array<Record<string, unknown>>
  const allFlat     = (hd?.all_gates            ?? [])                           as Array<Record<string, unknown>>

  for (const g of [...personality, ...design, ...allFlat]) {
    const num = Number(g.gate ?? g.number ?? g.id ?? 0)
    if (num >= 1 && num <= 64) gateSet.add(num)
  }

  return gateSet
}

function computeCompositeChannels(gatesA: Set<number>, gatesB: Set<number>): CompositeChannels {
  const result: CompositeChannels = {
    em: [], dominantA: [], dominantB: [], compromise: [], friendship: [],
  }
  const assigned = new Set<string>()

  for (const ch of CHANNEL_PAIRS) {
    const key      = `${ch.a}-${ch.b}`
    const aHasA    = gatesA.has(ch.a)
    const aHasB    = gatesA.has(ch.b)
    const bHasA    = gatesB.has(ch.a)
    const bHasB    = gatesB.has(ch.b)
    const aComplete = aHasA && aHasB
    const bComplete = bHasA && bHasB

    if (aComplete && bComplete) {
      result.compromise.push({ key, name: ch.name })
    } else if (aComplete) {
      result.dominantA.push({ key, name: ch.name })
    } else if (bComplete) {
      result.dominantB.push({ key, name: ch.name })
    } else if ((aHasA && bHasB) || (aHasB && bHasA)) {
      result.em.push({ key, name: ch.name })
    }
    assigned.add(key)
  }

  // Friendship: shared gate activations where no channel is fully complete in either person
  const sharedGates = new Set([...gatesA].filter(g => gatesB.has(g)))
  const friendshipSeen = new Set<string>()

  for (const ch of CHANNEL_PAIRS) {
    const key = `${ch.a}-${ch.b}`
    // Skip channels already classified (EM, dominant, compromise)
    const isAssignedFull =
      result.em.some(e => e.key === key) ||
      result.dominantA.some(e => e.key === key) ||
      result.dominantB.some(e => e.key === key) ||
      result.compromise.some(e => e.key === key)
    if (isAssignedFull) continue
    if (!friendshipSeen.has(key) && (sharedGates.has(ch.a) || sharedGates.has(ch.b))) {
      const sharedGate = sharedGates.has(ch.a) ? ch.a : ch.b
      result.friendship.push({ key, name: ch.name, sharedGate })
      friendshipSeen.add(key)
    }
  }

  return result
}

// ─── Layer 1 — Composite HD payload builder ───────────────────────────────────
//
// Sends only HD data + birth context for both persons.
// Natal astrology data is excluded — prevents Jyotish contamination of HD sections.

function buildCompositeHDPayload(chartJsonA: unknown, chartJsonB: unknown): unknown {
  const a = chartJsonA as Record<string, unknown>
  const b = chartJsonB as Record<string, unknown>
  return {
    person_a: { hd: a.hd, birth: a.birth },
    person_b: { hd: b.hd, birth: b.birth },
  }
}

// ─── Self-review footer ───────────────────────────────────────────────────────

const SELF_REVIEW =
  'As you write each sentence: if you use an em dash (—), replace it immediately with a ' +
  'comma or restructure the sentence. If you use "is not" or "are not", rewrite as an ' +
  'affirmative statement before continuing.'

// ─── Layer 3 + User message builder ──────────────────────────────────────────

function buildCompositeUserMessage(
  sectionName: string,
  payloadStr:  string,
  wordCap:     number,
): string {
  const disciplineDeclaration =
    'This is a Human Design composite section. Jovian Archive mechanics only. ' +
    'This payload contains Human Design chart data and birth data for two persons. ' +
    'Do not reference Jyotish astrology, nakshatras, dashas, yogas, rashis, bhavas, ' +
    'planetary dignities, Rahu/Ketu as Jyotish nodes, or any Jyotish mechanic. ' +
    'Interpret using Human Design mechanics from the Jovian Archive only. ' +
    'HD compatibility interpretation is explicitly authorized for this session.\n\n'

  return (
    disciplineDeclaration +
    `Here is the complete composite chart data:\n\n${payloadStr}\n\n` +
    `Interpret ${sectionName}. ` +
    `Speak directly to Person A in second person. ` +
    `Reference Person B by name if a name is available in the birth data, otherwise as your partner. ` +
    `Do not reference mechanics or data that belong to other sections. ` +
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
  const { chart_id_a, chart_id_b, tier, skip_columns } = body as {
    chart_id_a:    string
    chart_id_b:    string
    tier:          number
    skip_columns?: string[]
  }

  if (!chart_id_a || !chart_id_b) {
    return new Response(JSON.stringify({ error: 'chart_id_a and chart_id_b are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const skipSet       = new Set(Array.isArray(skip_columns) ? skip_columns : [])
  const adminSupabase = createAdminClient()

  // Load both charts by ID — not session-restricted; any authenticated user can run composite
  const [{ data: chartA, error: errA }, { data: chartB, error: errB }] = await Promise.all([
    adminSupabase.from('charts').select('chart_json').eq('id', chart_id_a).single(),
    adminSupabase.from('charts').select('chart_json').eq('id', chart_id_b).single(),
  ])

  if (errA || errB || !chartA?.chart_json || !chartB?.chart_json) {
    return new Response(JSON.stringify({ error: 'One or both charts not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Upsert composite row for this ordered pair (A→B is directional)
  const { data: existing } = await adminSupabase
    .from('hd_composite_interpretations')
    .select('id')
    .eq('chart_id_a', chart_id_a)
    .eq('chart_id_b', chart_id_b)
    .maybeSingle()

  let compositeId: string

  if (existing) {
    compositeId = existing.id
  } else {
    const { data: inserted, error: insertError } = await adminSupabase
      .from('hd_composite_interpretations')
      .insert({ chart_id_a, chart_id_b })
      .select('id')
      .single()

    if (insertError || !inserted) {
      console.error('[interpret-composite] failed to create composite record:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to create composite record' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    compositeId = inserted.id
  }

  // Compute composite channels from both charts' gate data
  const hdA    = (chartA.chart_json as Record<string, unknown>)?.hd
  const hdB    = (chartB.chart_json as Record<string, unknown>)?.hd
  const gatesA = extractGateNumbers(hdA)
  const gatesB = extractGateNumbers(hdB)
  const channels = computeCompositeChannels(gatesA, gatesB)

  console.log(
    `[interpret-composite] channels — EM:${channels.em.length} domA:${channels.dominantA.length} ` +
    `domB:${channels.dominantB.length} comp:${channels.compromise.length} ` +
    `friend:${channels.friendship.length} | ${chart_id_a}×${chart_id_b}`
  )

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
  systemDoc_configured = systemDoc_configured.replace(/\[INTAKE_JSON[^\]]*\]/g, 'N/A')
  systemDoc_configured = systemDoc_configured.replace(/\[CHART_JSON_B[^\]]*\]/g, 'Provided in the conversation turn.')

  // Layer 2 — HD composite system prompt:
  //   CLAUDE_SYSTEM.md + CLAUDE_CORE_COMPOSITE.md (self-contained, no ASTRO doc)
  const compositeSystemPrompt = [
    systemDoc_configured,
    '\n\n---\n\n',
    coreDoc,
  ].join('')

  console.log(
    `[interpret-composite] system prompt assembled — ${compositeSystemPrompt.length} chars | ` +
    `${COMPOSITE_FIXED_SECTIONS.length} fixed sections`
  )

  // Layer 1 — Strip astrology data from composite payload
  const payload    = buildCompositeHDPayload(chartA.chart_json, chartB.chart_json)
  const payloadStr = JSON.stringify(payload, null, 2)

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const encoder   = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      function send(payload: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      const completed:          string[]              = []
      const emResults:          Map<string, string>   = new Map()
      const dominantResults:    Map<string, string>   = new Map()
      const compromiseResults:  Map<string, string>   = new Map()
      const friendshipResults:  Map<string, string>   = new Map()

      // ─── Fixed sections ───────────────────────────────────────────────
      for (const section of COMPOSITE_FIXED_SECTIONS) {
        if (skipSet.has(section.column)) continue
        console.log(`[interpret-composite] generating ${section.column}`)

        try {
          const message = await anthropic.messages.create({
            model:       'claude-sonnet-4-6',
            max_tokens:  4096,
            temperature: 0.3,
            system:      compositeSystemPrompt,
            messages: [{
              role:    'user',
              content: buildCompositeUserMessage(section.name, payloadStr, section.wordCap),
            }],
          })

          const raw = message.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map(b => b.text)
            .join('')

          const text = await postProcess(raw, anthropic, section.column)

          if (compositeId && text) {
            const { error: dbError } = await adminSupabase
              .from('hd_composite_interpretations')
              .update({ [section.column]: text, updated_at: new Date().toISOString() })
              .eq('id', compositeId)
            if (dbError) console.error(`[interpret-composite] db write failed for ${section.column}:`, dbError)
          }

          completed.push(section.column)
          console.log(`[interpret-composite] ${section.column} done — ${text.length} chars`)
          send({ column: section.column, status: 'done', chars: text.length })

        } catch (err) {
          console.error(`[interpret-composite] ${section.column} failed:`, err)
          send({ column: section.column, status: 'error', error: String(err) })
        }
      }

      // ─── EM channel sections ──────────────────────────────────────────
      for (const ch of channels.em) {
        const colKey = `em_${ch.key.replace('-', '_')}`
        if (skipSet.has(colKey)) continue

        const name =
          `Channel ${ch.key} — ${ch.name} — as an electromagnetic channel in this composite. ` +
          'Person A provides one gate, Person B provides the other, together completing this channel. ' +
          'Interpret: which gate each person carries, the electromagnetic attraction this creates, ' +
          'how this channel energy is experienced differently by each person, ' +
          'the consistent frequency it generates in the relationship field, ' +
          'and the not-self distortion if either person tries to own or control this energy'

        console.log(`[interpret-composite] generating EM channel ${ch.key}`)

        try {
          const message = await anthropic.messages.create({
            model:       'claude-sonnet-4-6',
            max_tokens:  4096,
            temperature: 0.3,
            system:      compositeSystemPrompt,
            messages: [{
              role:    'user',
              content: buildCompositeUserMessage(name, payloadStr, 800),
            }],
          })

          const emRaw = message.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map(b => b.text)
            .join('')

          const text = await postProcess(emRaw, anthropic, colKey)

          if (text) {
            emResults.set(ch.key, text)
            if (compositeId) {
              const { error: dbError } = await adminSupabase
                .from('hd_composite_interpretations')
                .update({
                  composite_em_channels: Object.fromEntries(emResults),
                  updated_at:            new Date().toISOString(),
                })
                .eq('id', compositeId)
              if (dbError) console.error(`[interpret-composite] db write failed for EM ${ch.key}:`, dbError)
            }
          }

          completed.push(colKey)
          console.log(`[interpret-composite] EM ${ch.key} done — ${text.length} chars`)
          send({ column: colKey, status: 'done', chars: text.length })

        } catch (err) {
          console.error(`[interpret-composite] EM ${ch.key} failed:`, err)
          send({ column: colKey, status: 'error', error: String(err) })
        }
      }

      // ─── Dominant channel sections (A and B combined into one JSONB column) ─
      const allDominant = [
        ...channels.dominantA.map(ch => ({ ...ch, person: 'A' as const })),
        ...channels.dominantB.map(ch => ({ ...ch, person: 'B' as const })),
      ]

      for (const ch of allDominant) {
        const colKey = `dominant_${ch.key.replace('-', '_')}`
        if (skipSet.has(colKey)) continue

        const who  = ch.person === 'A' ? 'Person A' : 'Person B'
        const name =
          `Channel ${ch.key} — ${ch.name} — as ${who}'s dominant channel in this composite. ` +
          `${who} carries this channel completely. The other person does not. ` +
          'Interpret: what consistent energy this channel brings from ' + who + ' into the relationship, ' +
          'how the other person experiences being in the field of this channel without carrying it themselves, ' +
          'whether this creates empowerment, conditioning, or both for the non-carrier, ' +
          'and what correct relationship to this energy looks like for each person'

        console.log(`[interpret-composite] generating dominant channel ${ch.key} (${who})`)

        try {
          const message = await anthropic.messages.create({
            model:       'claude-sonnet-4-6',
            max_tokens:  4096,
            temperature: 0.3,
            system:      compositeSystemPrompt,
            messages: [{
              role:    'user',
              content: buildCompositeUserMessage(name, payloadStr, 600),
            }],
          })

          const domRaw = message.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map(b => b.text)
            .join('')

          const text = await postProcess(domRaw, anthropic, colKey)

          if (text) {
            dominantResults.set(ch.key, text)
            if (compositeId) {
              const { error: dbError } = await adminSupabase
                .from('hd_composite_interpretations')
                .update({
                  composite_dominant_channels: Object.fromEntries(dominantResults),
                  updated_at:                  new Date().toISOString(),
                })
                .eq('id', compositeId)
              if (dbError) console.error(`[interpret-composite] db write failed for dominant ${ch.key}:`, dbError)
            }
          }

          completed.push(colKey)
          console.log(`[interpret-composite] dominant ${ch.key} done — ${text.length} chars`)
          send({ column: colKey, status: 'done', chars: text.length })

        } catch (err) {
          console.error(`[interpret-composite] dominant ${ch.key} failed:`, err)
          send({ column: colKey, status: 'error', error: String(err) })
        }
      }

      // ─── Compromise channel sections ─────────────────────────────────
      for (const ch of channels.compromise) {
        const colKey = `compromise_${ch.key.replace('-', '_')}`
        if (skipSet.has(colKey)) continue

        const name =
          `Channel ${ch.key} — ${ch.name} — as a compromise channel in this composite. ` +
          'Both Person A and Person B carry this channel completely in their individual charts. ' +
          'Interpret: the resonance and recognition this creates when both people bring the same full channel energy, ' +
          'the amplification effect of the doubled definition, ' +
          'the specific friction patterns that arise when two people both own this channel and compete in its domain, ' +
          'and what healthy co-expression of this shared energy looks like'

        console.log(`[interpret-composite] generating compromise channel ${ch.key}`)

        try {
          const message = await anthropic.messages.create({
            model:       'claude-sonnet-4-6',
            max_tokens:  4096,
            temperature: 0.3,
            system:      compositeSystemPrompt,
            messages: [{
              role:    'user',
              content: buildCompositeUserMessage(name, payloadStr, 500),
            }],
          })

          const compRaw = message.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map(b => b.text)
            .join('')

          const text = await postProcess(compRaw, anthropic, colKey)

          if (text) {
            compromiseResults.set(ch.key, text)
            if (compositeId) {
              const { error: dbError } = await adminSupabase
                .from('hd_composite_interpretations')
                .update({
                  composite_compromise_channels: Object.fromEntries(compromiseResults),
                  updated_at:                    new Date().toISOString(),
                })
                .eq('id', compositeId)
              if (dbError) console.error(`[interpret-composite] db write failed for compromise ${ch.key}:`, dbError)
            }
          }

          completed.push(colKey)
          console.log(`[interpret-composite] compromise ${ch.key} done — ${text.length} chars`)
          send({ column: colKey, status: 'done', chars: text.length })

        } catch (err) {
          console.error(`[interpret-composite] compromise ${ch.key} failed:`, err)
          send({ column: colKey, status: 'error', error: String(err) })
        }
      }

      // ─── Friendship channel sections ──────────────────────────────────
      // Friendship: both persons share the same gate, but neither completes the full channel.
      // The shared gate creates a frequency of recognition without the full channel pressure.
      for (const ch of channels.friendship) {
        const colKey = `friendship_${ch.key.replace('-', '_')}`
        if (skipSet.has(colKey)) continue

        const name =
          `Channel ${ch.key} — ${ch.name} — as a friendship channel in this composite. ` +
          `Both Person A and Person B activate Gate ${ch.sharedGate} of this channel, ` +
          'but neither person completes the full channel. The other gate is inactive in both charts. ' +
          'Interpret: what the shared Gate ' + ch.sharedGate + ' activation creates as a frequency of recognition between them, ' +
          'how this shared gate creates a sense of deep familiarity or understanding without the full channel pressure, ' +
          'and what the incomplete channel means for how this domain of life operates in the relationship'

        console.log(`[interpret-composite] generating friendship channel ${ch.key} (gate ${ch.sharedGate})`)

        try {
          const message = await anthropic.messages.create({
            model:       'claude-sonnet-4-6',
            max_tokens:  2048,
            temperature: 0.3,
            system:      compositeSystemPrompt,
            messages: [{
              role:    'user',
              content: buildCompositeUserMessage(name, payloadStr, 500),
            }],
          })

          const friendRaw = message.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map(b => b.text)
            .join('')

          const text = await postProcess(friendRaw, anthropic, colKey)

          if (text) {
            friendshipResults.set(ch.key, text)
            if (compositeId) {
              const { error: dbError } = await adminSupabase
                .from('hd_composite_interpretations')
                .update({
                  composite_friendship_channels: Object.fromEntries(friendshipResults),
                  updated_at:                    new Date().toISOString(),
                })
                .eq('id', compositeId)
              if (dbError) console.error(`[interpret-composite] db write failed for friendship ${ch.key}:`, dbError)
            }
          }

          completed.push(colKey)
          console.log(`[interpret-composite] friendship ${ch.key} done — ${text.length} chars`)
          send({ column: colKey, status: 'done', chars: text.length })

        } catch (err) {
          console.error(`[interpret-composite] friendship ${ch.key} failed:`, err)
          send({ column: colKey, status: 'error', error: String(err) })
        }
      }

      const totalSections =
        COMPOSITE_FIXED_SECTIONS.length +
        channels.em.length +
        allDominant.length +
        channels.compromise.length +
        channels.friendship.length

      send({
        done:         true,
        composite_id: compositeId,
        completed,
        total:        totalSections,
        channels: {
          em:         channels.em.map(c => c.key),
          dominant_a: channels.dominantA.map(c => c.key),
          dominant_b: channels.dominantB.map(c => c.key),
          compromise: channels.compromise.map(c => c.key),
          friendship: channels.friendship.map(c => c.key),
        },
        skipped: Array.from(skipSet),
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
