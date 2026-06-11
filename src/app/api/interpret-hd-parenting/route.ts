import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { postProcess } from '@/lib/interpret/post-process'

// ─── Governing documents ──────────────────────────────────────────────────────
//
// HD Parenting sections receive:
//   CLAUDE_SYSTEM.md + CLAUDE_CORE.md (voice/tier rules only, identity stripped)
//   + CLAUDE_HD_PARENTING.md
//
// Natal astrology data is stripped from the payload (Layer 1).

const DOC_BASE = 'https://raw.githubusercontent.com/motorsui/motorsui-chart-api/main'

const HD_PARENTING_DOC_URLS = {
  system:    `${DOC_BASE}/CLAUDE_SYSTEM.md`,
  core:      `${DOC_BASE}/CLAUDE_CORE.md`,
  parenting: `${DOC_BASE}/CLAUDE_HD_PARENTING.md`,
}

// ─── Fixed section definitions ────────────────────────────────────────────────

interface HDParentingSectionDef {
  column:  string
  name:    string
  wordCap: number
}

const HD_PARENTING_FIXED_SECTIONS: HDParentingSectionDef[] = [
  {
    column:  'parenting_hd_type_strategy',
    name:    'Type and Strategy — what this child\'s energy type is, how they are designed to move through the world, and how their strategy works as a parenting tool for supporting correct timing and decisions',
    wordCap: 600,
  },
  {
    column:  'parenting_hd_authority',
    name:    'Authority — the specific inner signal this child can trust for decisions, how it operates in the body, and how a parent can support this child in accessing and honoring their authority rather than conditioning it away',
    wordCap: 600,
  },
  {
    column:  'parenting_hd_profile',
    name:    'Profile — the conscious and unconscious lines, their combined archetypal role, how they shape this child\'s relational field and life path, and what a parent needs to understand about the social and learning style this profile produces',
    wordCap: 1000,
  },
  {
    column:  'parenting_hd_definition',
    name:    'Definition — Single, Split, Triple Split, or Quadruple Split: what this configuration means for how this child relates to others, where they are consistent versus where they are conditioned, and what the parent needs to know about bridging the split if one exists',
    wordCap: 800,
  },
  {
    column:  'parenting_hd_signature',
    name:    'Signature — the specific feeling state that signals this child is living in alignment with their design, what it looks and feels like in a child\'s body and behavior, and how a parent can recognize and support it',
    wordCap: 400,
  },
  {
    column:  'parenting_hd_not_self',
    name:    'Not-Self Theme — the specific emotional or behavioral signal that this child is operating against their design, what it looks like in a child\'s body and behavior at different developmental stages, and what a parent can do when they see it',
    wordCap: 400,
  },
  {
    column:  'parenting_hd_incarnation_cross',
    name:    'Incarnation Cross — the four-gate purpose structure, the geometry, and what this cross means for the life direction this child is here to move toward — framed as the parent\'s understanding of their child\'s long arc, not a prescription',
    wordCap: 1200,
  },
  {
    column:  'parenting_hd_center_head',
    name:    'Head Center — whether defined or undefined in this child\'s chart, what that means for how they experience mental pressure, inspiration, and questions, and how a parent supports a healthy relationship to this center\'s energy',
    wordCap: 500,
  },
  {
    column:  'parenting_hd_center_ajna',
    name:    'Ajna Center — whether defined or undefined, what that means for how this child conceptualizes, forms opinions, and relates to certainty, and how a parent can support this center\'s healthy expression',
    wordCap: 500,
  },
  {
    column:  'parenting_hd_center_throat',
    name:    'Throat Center — whether defined or undefined, what that means for how this child communicates, expresses, and manifests, and what a parent needs to know about supporting this child\'s voice',
    wordCap: 500,
  },
  {
    column:  'parenting_hd_center_g',
    name:    'G Center — whether defined or undefined, what that means for this child\'s sense of identity, direction, and love, and how a parent can support a healthy relationship to self and others in this center\'s domain',
    wordCap: 500,
  },
  {
    column:  'parenting_hd_center_heart',
    name:    'Heart/Ego Center — whether defined or undefined, what that means for this child\'s willpower, self-worth, and promises, and what a parent needs to know about pressure, motivation, and follow-through with this child',
    wordCap: 500,
  },
  {
    column:  'parenting_hd_center_sacral',
    name:    'Sacral Center — whether defined or undefined, what that means for this child\'s life force, energy availability, and response capacity, and how a parent can work with rather than against this center\'s nature',
    wordCap: 500,
  },
  {
    column:  'parenting_hd_center_solar_plexus',
    name:    'Solar Plexus Center — whether defined or undefined, what that means for this child\'s emotional wave, truth, and clarity, and how a parent supports emotional development without suppressing or amplifying the wave',
    wordCap: 500,
  },
  {
    column:  'parenting_hd_center_spleen',
    name:    'Spleen Center — whether defined or undefined, what that means for this child\'s intuition, immune awareness, and fear response, and how a parent can support body wisdom and healthy boundaries',
    wordCap: 500,
  },
  {
    column:  'parenting_hd_center_root',
    name:    'Root Center — whether defined or undefined, what that means for this child\'s relationship to pressure, adrenaline, and stress, and how a parent can manage the environment to support rather than dysregulate this center',
    wordCap: 500,
  },
  {
    column:  'parenting_hd_personality_gates',
    name:    'Personality Gates — all conscious (Personality column) gates active in this child\'s design: what each gate contributes to the child\'s conscious expression, gifts, and challenges as a group narrative, framed for the parent',
    wordCap: 1000,
  },
  {
    column:  'parenting_hd_design_gates',
    name:    'Design Gates — all unconscious (Design column) gates active in this child\'s design: what each gate contributes to the child\'s body intelligence, instinctive patterns, and somatic expression as a group narrative, framed for the parent',
    wordCap: 1000,
  },
  {
    column:  'parenting_hd_fear_gates',
    name:    'Fear Gates — any active Fear Gates (the seven Spleen center awareness gates: 18, 28, 32, 44, 48, 50, 57) present in this child\'s chart, what each produces as a survival signal in a child\'s body, and how a parent supports healthy navigation of each fear',
    wordCap: 800,
  },
  {
    column:  'parenting_hd_melancholy_gates',
    name:    'Melancholy Gates — any active Individual circuit gates present in this child\'s chart, what the melancholic wave produces in a child\'s experience, and how a parent can recognize and hold space for this without pathologizing it',
    wordCap: 800,
  },
  {
    column:  'parenting_hd_penta_qualities',
    name:    'Penta Qualities — this child\'s Penta line qualities (lines 1–6) and what they mean for how this child functions within family and group dynamics, and what a parent can understand about their child\'s natural role in collective settings',
    wordCap: 600,
  },
  {
    column:  'parenting_hd_variable_brain',
    name:    'Brain — First Transformation (Determination): how this child is designed to take in food and process information, and what a parent needs to know about creating the right conditions for this child\'s body and mind to function well',
    wordCap: 500,
  },
  {
    column:  'parenting_hd_variable_setting',
    name:    'Setting — Second Transformation (Environment): the physical and social environment conditions this child needs to thrive, and how a parent can shape home, school, and social settings to support rather than stress this child\'s design',
    wordCap: 500,
  },
  {
    column:  'parenting_hd_variable_storyline',
    name:    'Storyline — Third Transformation (Perspective): how this child is designed to take in the world visually and cognitively, whether focused or peripheral, and what a parent needs to understand about how this child learns and perceives',
    wordCap: 500,
  },
  {
    column:  'parenting_hd_variable_mind',
    name:    'Mind — Fourth Transformation (Motivation): what authentically drives this child\'s decisions and engagement, and how a parent can support motivation that is correct for this child\'s design rather than imposed from the outside',
    wordCap: 500,
  },
]

// ─── Self-review footer ───────────────────────────────────────────────────────

const SELF_REVIEW =
  'As you write each sentence: if you use an em dash (—), replace it immediately with a ' +
  'comma or restructure the sentence. If you use "is not" or "are not", rewrite as an ' +
  'affirmative statement before continuing.'

// ─── Layer 1 — HD payload builder ────────────────────────────────────────────

function buildHDParentingPayload(chartJson: unknown): unknown {
  const json = chartJson as Record<string, unknown>
  return { hd: json.hd, birth: json.birth }
}

// ─── Layer 2 — Identity stripper ─────────────────────────────────────────────

function extractVoiceAndTierRules(coreDoc: string): string {
  return coreDoc.replace(/## SYSTEM IDENTITY[\s\S]*?(?=## TIER ARCHITECTURE)/, '')
}

// ─── Channel extractor ────────────────────────────────────────────────────────

function extractDefinedChannels(hdData: unknown): Array<{key: string; name: string}> {
  const hd  = hdData as Record<string, unknown>
  const raw = (hd?.channels ?? hd?.defined_channels ?? []) as Array<Record<string, unknown>>
  return raw
    .map(ch => ({ key: String(ch.channel ?? ch.id ?? ''), name: String(ch.name ?? ch.channel ?? '') }))
    .filter(ch => ch.key !== '')
}

// ─── Layer 3 + User message builder ──────────────────────────────────────────

function buildHDParentingUserMessage(name: string, hdPayloadStr: string, wordCap: number): string {
  const disciplineDeclaration =
    'This is a Human Design parenting section. Jovian Archive mechanics only. ' +
    'The subject is a child. Address the parent throughout — "your child", "they", "their". ' +
    'This payload contains Human Design chart data and birth data. ' +
    'Do not reference Jyotish astrology, nakshatras, dashas, yogas, rashis, bhavas, ' +
    'planetary dignities, Rahu/Ketu as Jyotish nodes, or any Jyotish mechanic. ' +
    'Interpret using Human Design mechanics from the Jovian Archive only, filtered through the parenting lens.\n\n'

  return (
    disciplineDeclaration +
    `Here is the complete chart data:\n\n${hdPayloadStr}\n\n` +
    `Interpret ${name} only. ` +
    `Do not reference mechanics or data that belong to other sections. ` +
    `Address the parent in second person, present tense. ` +
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
  const { chart_json, tier, chart_id, skip_columns } = body as {
    chart_json:    unknown
    tier:          number
    chart_id:      string
    skip_columns?: string[]
  }

  const skipSet = new Set(Array.isArray(skip_columns) ? skip_columns : [])

  if (!chart_json) {
    return new Response(JSON.stringify({ error: 'No chart data received' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const [systemDoc, coreDoc, hdParentingDoc] = await Promise.all([
    fetch(HD_PARENTING_DOC_URLS.system).then(r => r.text()),
    fetch(HD_PARENTING_DOC_URLS.core).then(r => r.text()),
    fetch(HD_PARENTING_DOC_URLS.parenting).then(r => r.text()),
  ])

  let systemDoc_configured = systemDoc
  systemDoc_configured = systemDoc_configured.replace('[TIER_1 / TIER_2 / TIER_3]', `TIER_${tier}`)
  systemDoc_configured = systemDoc_configured.replace('[USER_NAME]', user.email ?? 'User')
  systemDoc_configured = systemDoc_configured.replace('[TRUE / FALSE]', 'FALSE')
  systemDoc_configured = systemDoc_configured.replace(/\[CHART_JSON[^\]]*\]/g, 'Provided in the conversation turn.')
  systemDoc_configured = systemDoc_configured.replace(/\[INTAKE_JSON[^\]]*\]/g, 'N/A')
  systemDoc_configured = systemDoc_configured.replace(/\[CHART_JSON_B[^\]]*\]/g, 'N/A')

  const hdParentingSystemPrompt = [
    systemDoc_configured,
    '\n\n---\n\n',
    extractVoiceAndTierRules(coreDoc),
    '\n\n---\n\n',
    hdParentingDoc,
  ].join('')

  console.log(
    `[interpret-hd-parenting] system prompt assembled — ${hdParentingSystemPrompt.length} chars | chart_id=${chart_id}`
  )

  const hdParentingPayload    = buildHDParentingPayload(chart_json)
  const hdParentingPayloadStr = JSON.stringify(hdParentingPayload, null, 2)

  const hdData   = (chart_json as Record<string, unknown>)?.hd
  const channels = extractDefinedChannels(hdData)

  console.log(
    `[interpret-hd-parenting] ${HD_PARENTING_FIXED_SECTIONS.length} fixed sections | ${channels.length} channels`
  )

  const anthropic     = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const adminSupabase = createAdminClient()
  const encoder       = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      function send(payload: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      const completed:      string[]            = []
      const channelResults: Map<string, string> = new Map()

      // ─── Fixed sections ──────────────────────────────────────────────
      for (const section of HD_PARENTING_FIXED_SECTIONS) {
        if (skipSet.has(section.column)) continue
        console.log(`[interpret-hd-parenting] generating ${section.column}`)

        try {
          const message = await anthropic.messages.create({
            model:       'claude-sonnet-4-6',
            max_tokens:  4096,
            temperature: 0.3,
            system:      hdParentingSystemPrompt,
            messages: [{
              role:    'user',
              content: buildHDParentingUserMessage(section.name, hdParentingPayloadStr, section.wordCap),
            }],
          })

          const raw = message.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map(b => b.text)
            .join('')

          // Post-process: em dashes + "is not"/"are not"
          const text = await postProcess(raw, anthropic, section.column)

          if (chart_id && text) {
            const { error: dbError } = await adminSupabase
              .from('charts')
              .update({ [section.column]: text, updated_at: new Date().toISOString() })
              .eq('id', chart_id)
            if (dbError) console.error(`[interpret-hd-parenting] db write failed for ${section.column}:`, dbError)
          }

          completed.push(section.column)
          console.log(`[interpret-hd-parenting] ${section.column} done — ${text.length} chars`)
          send({ column: section.column, status: 'done', chars: text.length })

        } catch (err) {
          console.error(`[interpret-hd-parenting] ${section.column} failed:`, err)
          send({ column: section.column, status: 'error', error: String(err) })
        }
      }

      // ─── Channel sections (variable) ─────────────────────────────────
      for (const ch of channels) {
        const colKey = `parenting_channel_${ch.key.replace('-', '_')}`
        if (skipSet.has(colKey)) continue

        const name =
          `Channel ${ch.key}${ch.name && ch.name !== ch.key ? ` — ${ch.name}` : ''}: ` +
          'circuit classification, the consistent energy it produces in this child\'s design, ' +
          'how it shows up in behavior and relational dynamics at different developmental stages, ' +
          'and how a parent can work with rather than against this channel\'s energy'

        console.log(`[interpret-hd-parenting] generating channel ${ch.key}`)

        try {
          const message = await anthropic.messages.create({
            model:       'claude-sonnet-4-6',
            max_tokens:  4096,
            temperature: 0.3,
            system:      hdParentingSystemPrompt,
            messages: [{
              role:    'user',
              content: buildHDParentingUserMessage(name, hdParentingPayloadStr, 1000),
            }],
          })

          const raw = message.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map(b => b.text)
            .join('')

          const text = await postProcess(raw, anthropic, colKey)

          if (text) {
            channelResults.set(ch.key, text)
            if (chart_id) {
              const { error: dbError } = await adminSupabase
                .from('charts')
                .update({
                  parenting_hd_channels: Object.fromEntries(channelResults),
                  updated_at:            new Date().toISOString(),
                })
                .eq('id', chart_id)
              if (dbError) console.error(`[interpret-hd-parenting] db write failed for channel ${ch.key}:`, dbError)
            }
          }

          completed.push(colKey)
          console.log(`[interpret-hd-parenting] channel ${ch.key} done — ${text.length} chars`)
          send({ column: colKey, status: 'done', chars: text.length })

        } catch (err) {
          console.error(`[interpret-hd-parenting] channel ${ch.key} failed:`, err)
          send({ column: colKey, status: 'error', error: String(err) })
        }
      }

      send({
        done:     true,
        completed,
        total:    HD_PARENTING_FIXED_SECTIONS.length + channels.length,
        channels: channels.map(c => c.key),
        skipped:  Array.from(skipSet),
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
