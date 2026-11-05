import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { extractBirthPayload, fetchDomainConclusions, buildDomainContextBlock } from '@/lib/interpret/domain-conclusions'
import {
  birthFromChartJson, configureSystemDoc, fetchCalculation, fetchGoverningDoc, findOrCreatePairRow,
  generateDirect, hasEntitlement, isMissing, jsonError, loadOwnedPair, sectionStream, writeRow,
  InterpretFailure,
} from '@/lib/interpret/backend'
import { buildPairIntakePayload } from '@/lib/intake-questions'
import { loadSubmittedPartnerAnswers } from '@/lib/partner-intake-claim'

// ─── Loving HD (composite) ────────────────────────────────────────────────────
//
// Generated here. Governing documents, served by the backend:
//   CLAUDE_SYSTEM.md + CLAUDE_HD_COMPOSITE.md + PSYCHOLOGY LAYER (CLAUDE_CORE_COMPOSITE.md)
//
// CLAUDE_ASTRO.md is NOT loaded — no Jyotish content in composite sections.
// Person A is the caller's own chart; Person B is the caller's partner chart.
//
// Three contamination layers (reversed from astrology route):
//   Layer 1 — Payload: person_a/person_b {hd, birth} + /hd/composite output,
//             with the Jyotish fields of karmic_axis_overlay removed
//   Layer 2 — System prompt: no ASTRO doc
//   Layer 3 — User message: hard declaration forbidding Jyotish; compatibility authorized

const TABLE = 'hd_composite_interpretations'

// ─── Channel pairs — all 35 defined HD channels ───────────────────────────────
// Used only for friendship channels (shared gate, channel complete in neither
// person). EM / dominant / compromise come from the backend's
// channel_dominance_map, the same calculation that defines each chart.

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
  { a: 10, b: 34, name: 'Exploration' },
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

function classifyChannels(composite: Record<string, unknown>): CompositeChannels {
  const result: CompositeChannels = { em: [], dominantA: [], dominantB: [], compromise: [], friendship: [] }
  const map = (composite.channel_dominance_map ?? []) as Array<{ channel: string; name: string; source: string }>
  for (const ch of map) {
    const entry = { key: ch.channel, name: ch.name }
    if (ch.source === 'electromagnetic') result.em.push(entry)
    else if (ch.source === 'person1')    result.dominantA.push(entry)
    else if (ch.source === 'person2')    result.dominantB.push(entry)
    else if (ch.source === 'shared')     result.compromise.push(entry)
  }

  // Friendship: shared gate activations where no channel is fully complete in either person
  const classified  = new Set(map.map(c => c.channel))
  const sharedGates = new Set((composite.shared_gates ?? []) as number[])
  for (const ch of CHANNEL_PAIRS) {
    const key = `${ch.a}-${ch.b}`
    if (classified.has(key)) continue
    if (sharedGates.has(ch.a) || sharedGates.has(ch.b)) {
      result.friendship.push({ key, name: ch.name, sharedGate: sharedGates.has(ch.a) ? ch.a : ch.b })
    }
  }
  return result
}

// ─── Layer 1 — Composite HD payload builder ───────────────────────────────────
//
// Sends only HD data + birth context for both persons, plus the calculated
// composite. Natal astrology data is excluded — prevents Jyotish contamination
// of HD sections. karmic_axis_overlay carries degree aspects and Saturn sign
// lords (Jyotish); those fields are removed, its gate-level signals kept.
// Each person's HD chart also carries sidereal position fields per activation
// and a Jyotish karmic profile under karmic_gate_overlay; CLAUDE_CORE_COMPOSITE.md
// excludes both, and the Karmic Axis exception covers gate-level signals only.

const JYOTISH_FIELDS = new Set(['sign', 'nakshatra', 'pada', 'planet_degree', 'jyotish_karmic_profile'])

function stripJyotishFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripJyotishFields)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([k]) => !JYOTISH_FIELDS.has(k))
      .map(([k, v]) => [k, stripJyotishFields(v)]))
  }
  return value
}

function buildCompositeHDPayload(chartJsonA: unknown, chartJsonB: unknown, composite: Record<string, unknown>): Record<string, unknown> {
  const a = chartJsonA as Record<string, unknown>
  const b = chartJsonB as Record<string, unknown>
  const calc = JSON.parse(JSON.stringify(composite)) as Record<string, unknown>
  const kax  = calc.karmic_axis_overlay as Record<string, unknown> | undefined
  if (kax) {
    delete kax.karmic_planet_aspects
    const dyn = kax.saturn_karmic_dynamic as Record<string, unknown> | undefined
    if (dyn) {
      for (const k of ['person_a_saturn_sign', 'person_a_saturn_sign_lord',
                       'person_b_saturn_sign', 'person_b_saturn_sign_lord', 'naisargika_relationship']) delete dyn[k]
    }
  }
  return {
    person_a:  { hd: stripJyotishFields(a.hd), birth: a.birth },
    person_b:  { hd: stripJyotishFields(b.hd), birth: b.birth },
    composite: calc,
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
    `The calculated composite and compatibility signals for the pair are in composite. ` +
    `Speak directly to Person A in second person. ` +
    `Reference Person B by name if a name is available in the birth data, otherwise as your partner. ` +
    `Person B's intake answers inform the reading but stay confidential: never quote, paraphrase or attribute any of them. ` +
    `Do not reference mechanics or data that belong to other sections. ` +
    `No bullet points. No markdown. No asterisks. No em dashes. ` +
    `No hedging language. No textbook definitions. ` +
    SELF_REVIEW + ' ' +
    `Write up to ${wordCap} words. Do not exceed ${wordCap} words.`
  )
}

// ─── Channel section prompts (wording unchanged) ─────────────────────────────

function emName(ch: ChannelEntry): string {
  const name =
    `Channel ${ch.key} — ${ch.name} — as an electromagnetic channel in this composite. ` +
    'Person A provides one gate, Person B provides the other, together completing this channel. ' +
    'Interpret: which gate each person carries, the electromagnetic attraction this creates, ' +
    'how this channel energy is experienced differently by each person, ' +
    'the consistent frequency it generates in the relationship field, ' +
    'and the not-self distortion if either person tries to own or control this energy'
  return name
}

function dominantName(ch: ChannelEntry & { person: 'A' | 'B' }): string {
  const who  = ch.person === 'A' ? 'Person A' : 'Person B'
  const name =
    `Channel ${ch.key} — ${ch.name} — as ${who}'s dominant channel in this composite. ` +
    `${who} carries this channel completely. The other person does not. ` +
    'Interpret: what consistent energy this channel brings from ' + who + ' into the relationship, ' +
    'how the other person experiences being in the field of this channel without carrying it themselves, ' +
    'whether this creates empowerment, conditioning, or both for the non-carrier, ' +
    'and what correct relationship to this energy looks like for each person'
  return name
}

function compromiseName(ch: ChannelEntry): string {
  const name =
    `Channel ${ch.key} — ${ch.name} — as a compromise channel in this composite. ` +
    'Both Person A and Person B carry this channel completely in their individual charts. ' +
    'Interpret: the resonance and recognition this creates when both people bring the same full channel energy, ' +
    'the amplification effect of the doubled definition, ' +
    'the specific friction patterns that arise when two people both own this channel and compete in its domain, ' +
    'and what healthy co-expression of this shared energy looks like'
  return name
}

function friendshipName(ch: FriendshipEntry): string {
  const name =
    `Channel ${ch.key} — ${ch.name} — as a friendship channel in this composite. ` +
    `Both Person A and Person B activate Gate ${ch.sharedGate} of this channel, ` +
    'but neither person completes the full channel. The other gate is inactive in both charts. ' +
    'Interpret: what the shared Gate ' + ch.sharedGate + ' activation creates as a frequency of recognition between them, ' +
    'how this shared gate creates a sense of deep familiarity or understanding without the full channel pressure, ' +
    'and what the incomplete channel means for how this domain of life operates in the relationship'
  return name
}

// ─── Route ────────────────────────────────────────────────────────────────────

// Per-channel sections are stored as JSONB maps keyed by channel ("27-50");
// the stream reports them as colKeys ("em_27_50").
const CHANNEL_GROUPS = [
  { prefix: 'em',         column: 'composite_em_channels',         wordCap: 800, maxTokens: 4096 },
  { prefix: 'dominant',   column: 'composite_dominant_channels',   wordCap: 600, maxTokens: 4096 },
  { prefix: 'compromise', column: 'composite_compromise_channels', wordCap: 500, maxTokens: 4096 },
  { prefix: 'friendship', column: 'composite_friendship_channels', wordCap: 500, maxTokens: 2048 },
] as const

type Group = typeof CHANNEL_GROUPS[number]

interface ChannelJob { group: Group; key: string; name: string; label: string }

function channelJobs(channels: CompositeChannels): Map<string, ChannelJob> {
  const [em, dominant, compromise, friendship] = CHANNEL_GROUPS
  const jobs = new Map<string, ChannelJob>()
  const add = (group: Group, ch: ChannelEntry, name: string, kind: string) =>
    jobs.set(`${group.prefix}_${ch.key.replace('-', '_')}`, { group, key: ch.key, name, label: `${kind} · ${ch.key} ${ch.name}` })
  for (const ch of channels.em)         add(em, ch, emName(ch), 'Electromagnetic')
  for (const ch of channels.dominantA)  add(dominant, ch, dominantName({ ...ch, person: 'A' }), 'Dominant (Person A)')
  for (const ch of channels.dominantB)  add(dominant, ch, dominantName({ ...ch, person: 'B' }), 'Dominant (Person B)')
  for (const ch of channels.compromise) add(compromise, ch, compromiseName(ch), 'Compromise')
  for (const ch of channels.friendship) add(friendship, ch, friendshipName(ch), 'Friendship')
  return jobs
}

async function resolve(): Promise<Response | {
  self: Record<string, unknown>; partner: Record<string, unknown>
  birthA: Record<string, number>; birthB: Record<string, number>
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)
  if (!(await hasEntitlement(supabase, user.id, ['hd_composite_report']))) return jsonError('Not purchased', 403)
  const pair = await loadOwnedPair(supabase, user.id)
  if (pair instanceof Response) return pair
  const birthA = birthFromChartJson(pair.self.chart_json)
  const birthB = birthFromChartJson(pair.partner.chart_json)
  if (!birthA || !birthB) return jsonError('Chart has no usable birth data', 422)
  return { ...pair, birthA, birthB }
}

interface Plan {
  composite: Record<string, unknown>
  channels:  CompositeChannels
  jobs:      Map<string, ChannelJob>
  offered:   string[]
}

// The channel sections offered depend on the calculated composite, so it is
// computed before anything is generated.
async function plan(birthA: Record<string, number>, birthB: Record<string, number>): Promise<Plan | Response> {
  let composite: Record<string, unknown>
  try {
    composite = await fetchCalculation('/hd/composite', { person1: birthA, person2: birthB })
  } catch (err) {
    const f = err instanceof InterpretFailure ? err : null
    return jsonError(f?.message ?? 'Composite calculation failed', f?.status ?? 502)
  }
  const channels = classifyChannels(composite)
  const jobs     = channelJobs(channels)
  return { composite, channels, jobs, offered: [...COMPOSITE_FIXED_SECTIONS.map(s => s.column), ...jobs.keys()] }
}

function storedText(row: Record<string, unknown> | null, jobs: Map<string, ChannelJob>, column: string): unknown {
  const job = jobs.get(column)
  if (!job) return row?.[column]
  return (row?.[job.group.column] as Record<string, unknown> | null | undefined)?.[job.key]
}

// Returns the caller's stored composite row, the channel sections this pair is
// offered, and which sections are still missing (RLS keeps pair rows server-side).
export async function GET() {
  const ctx = await resolve()
  if (ctx instanceof Response) return ctx
  const { data } = await createAdminClient()
    .from(TABLE).select('*').eq('chart_id_a', String(ctx.self.id)).eq('chart_id_b', String(ctx.partner.id)).maybeSingle()
  const row = (data as Record<string, unknown> | null) ?? null
  const p   = await plan(ctx.birthA, ctx.birthB)
  if (p instanceof Response) return Response.json({ row, channels: [], pending: null })
  return Response.json({
    row,
    channels: [...p.jobs.entries()].map(([column, j]) => ({ column, map: j.group.column, key: j.key, label: j.label })),
    pending:  p.offered.filter(c => isMissing(storedText(row, p.jobs, c))),
  })
}

export async function POST(request: NextRequest) {
  const ctx = await resolve()
  if (ctx instanceof Response) return ctx
  const { self, partner, birthA, birthB } = ctx

  const body  = await request.json().catch(() => ({})) as { columns?: unknown }
  const asked = Array.isArray(body.columns) ? new Set(body.columns.map(String)) : null
  // Each partner's answers travel with their own question wording and version,
  // under the same person_a / person_b labels as the chart payload. Nothing is
  // generated until both partners have submitted.
  const partnerAnswers = await loadSubmittedPartnerAnswers(createAdminClient(), String(partner.id))
  const intake = buildPairIntakePayload(self, partnerAnswers)
  if (!intake) return jsonError('Both partners must submit their intake before the reading is generated', 409)
  const intakeA = intake.person_a as Record<string, unknown>

  const p = await plan(birthA, birthB)
  if (p instanceof Response) return p
  const { composite, channels, jobs, offered } = p

  const admin = createAdminClient()
  const row   = await findOrCreatePairRow(admin, TABLE, String(self.id), String(partner.id))
  if (row instanceof Response) return row

  // Stored maps are seeded from the row so a partial run never drops earlier channels.
  const maps = new Map(CHANNEL_GROUPS.map(g => [g.column, { ...((row[g.column] as Record<string, string> | null) ?? {}) }]))

  const missing = offered.filter(c => isMissing(storedText(row, jobs, c)) && (!asked || asked.has(c)))
  const skipped = offered.filter(c => !missing.includes(c))
  const fixedByColumn = new Map(COMPOSITE_FIXED_SECTIONS.map(s => [s.column, s]))

  console.log(
    `[interpret-composite] channels — EM:${channels.em.length} domA:${channels.dominantA.length} ` +
    `domB:${channels.dominantB.length} comp:${channels.compromise.length} friend:${channels.friendship.length}`
  )

  // Assembled once, on first pending section. Any failure fails every section.
  let context: Promise<{ system: string; payloadStr: string }> | null = null
  const getContext = () => context ??= (async () => {
    const conclusionBirth = extractBirthPayload(self.chart_json)
    const [systemDoc, familyDoc, coreDoc, conclusions] = await Promise.all([
      fetchGoverningDoc('CLAUDE_SYSTEM.md'),
      fetchGoverningDoc('CLAUDE_HD_COMPOSITE.md'),
      fetchGoverningDoc('CLAUDE_CORE_COMPOSITE.md'),
      conclusionBirth ? fetchDomainConclusions(conclusionBirth, 'relational', intakeA) : Promise.resolve(null),
    ])
    const configured = configureSystemDoc(systemDoc, {
      product:       'hd_composite',
      personA:       'person_a',
      personB:       'person_b',
      intake:        !!intake,
      conclusions:   !!conclusions,
      classicalOnly: false,
    })
    const payload = buildCompositeHDPayload(self.chart_json, partner.chart_json, composite)
    payload.intake = intake
    // Score summary only, as on main. The full conclusions object carries
    // Jyotish evidence (headline signals, planets, houses, dignities) that
    // CLAUDE_CORE_COMPOSITE.md excludes from this product.
    if (conclusions) payload.domain_conclusions = buildDomainContextBlock(conclusions)
    return {
      system:     configured + '\n\n---\n\n' + familyDoc + '\n\n---\nPSYCHOLOGY LAYER\n\n' + coreDoc,
      payloadStr: JSON.stringify(payload, null, 2),
    }
  })()

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const rowId     = String(row.id)

  return sectionStream('interpret-composite', missing, skipped, async column => {
    const c     = await getContext()
    const fixed = fixedByColumn.get(column)
    if (fixed) {
      const result = await generateDirect({
        anthropic, system: c.system, section: column, product: 'composite',
        user: buildCompositeUserMessage(fixed.name, c.payloadStr, fixed.wordCap),
      })
      await writeRow(admin, TABLE, rowId, { [column]: result.text })
      return result
    }
    const job    = jobs.get(column)!
    const result = await generateDirect({
      anthropic, system: c.system, section: column, product: 'composite', maxTokens: job.group.maxTokens,
      user: buildCompositeUserMessage(job.name, c.payloadStr, job.group.wordCap),
    })
    const map = maps.get(job.group.column)!
    map[job.key] = result.text
    await writeRow(admin, TABLE, rowId, { [job.group.column]: map })
    return result
  })
}
