import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const CLAUDE_DOCS = [
  'https://raw.githubusercontent.com/motorsui/motorsui-chart-api/main/CLAUDE_SYSTEM.md',
  'https://raw.githubusercontent.com/motorsui/motorsui-chart-api/main/CLAUDE_CORE.md',
  'https://raw.githubusercontent.com/motorsui/motorsui-chart-api/main/CLAUDE_ASTRO.md',
  'https://raw.githubusercontent.com/motorsui/motorsui-chart-api/main/CLAUDE_HD.md',
]

type TierColumn = 'interpretation_t1' | 'interpretation_t2' | 'interpretation_t3'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { chart_json, tier, chart_id } = await request.json()

  const chartJsonStr = JSON.stringify(chart_json, null, 2)
  console.log(`[interpret] chart_json received — ${chartJsonStr.length} chars, tier=${tier}, chart_id=${chart_id}`)

  if (!chart_json || chartJsonStr === 'null') {
    return NextResponse.json({ error: 'No chart data received' }, { status: 400 })
  }

  // Fetch all four governing documents in parallel
  const [systemDoc, coreDoc, astroDoc, hdDoc] = await Promise.all(
    CLAUDE_DOCS.map(url => fetch(url).then(r => r.text()))
  )

  // Inject session parameters into CLAUDE_SYSTEM.md template
  let systemPrompt = systemDoc
  systemPrompt = systemPrompt.replace('[TIER_1 / TIER_2 / TIER_3]', `TIER_${tier}`)
  systemPrompt = systemPrompt.replace('[USER_NAME]', user.email ?? 'User')
  systemPrompt = systemPrompt.replace('[TRUE / FALSE]', 'FALSE')

  const intakeStart = systemPrompt.indexOf('[INTAKE_JSON')
  const intakeEnd   = systemPrompt.indexOf(']', intakeStart)
  if (intakeStart !== -1 && intakeEnd !== -1) {
    systemPrompt = systemPrompt.slice(0, intakeStart) + 'N/A' + systemPrompt.slice(intakeEnd + 1)
  }

  const chartJsonAStart = systemPrompt.indexOf('[CHART_JSON')
  const chartJsonAEnd   = systemPrompt.indexOf(']', chartJsonAStart)
  if (chartJsonAStart !== -1 && chartJsonAEnd !== -1) {
    systemPrompt = systemPrompt.slice(0, chartJsonAStart) + chartJsonStr + systemPrompt.slice(chartJsonAEnd + 1)
  }

  const chartBStart = systemPrompt.indexOf('[CHART_JSON_B')
  const chartBEnd   = systemPrompt.indexOf(']', chartBStart)
  if (chartBStart !== -1 && chartBEnd !== -1) {
    systemPrompt = systemPrompt.slice(0, chartBStart) + 'N/A' + systemPrompt.slice(chartBEnd + 1)
  }

  const fullSystemPrompt = [
    systemPrompt,
    '\n\n---\n\n',
    coreDoc,
    '\n\n---\n\n',
    astroDoc,
    '\n\n---\n\n',
    hdDoc,
  ].join('')

  console.log(`[interpret] system prompt assembled — ${fullSystemPrompt.length} chars`)

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    temperature: 0.3,
    system: fullSystemPrompt,
    messages: [
      {
        role: 'user',
        content: `Here is the chart data for this interpretation:

${chartJsonStr}

Generate a Tier ${tier} interpretation with the following five sections in this exact order. Go deep on each section. Do not summarize broadly. Do not cover everything shallowly. Minimum word counts are hard floors not targets.

SECTION 1 — HD CORE IDENTITY (400 words minimum)
Interpret Type, Strategy, Authority, Profile, Definition, Signature, and Not-Self Theme as a living operating system for this specific chart configuration. Use MotorSui secular terminology exclusively. Write at Jovian Archive practitioner depth — not textbook definitions, but what these mechanics mean together for this person.

SECTION 2 — INCARNATION CROSS (300 words minimum)
Interpret the cross as a single unified dharmic life theme. Name the cross geometry (Right Angle, Left Angle, or Juxtaposition) and what that geometry means for how this cross operates in this life. Name the Quarter and its overarching theme. Name the cross itself as a container for this life's purpose. The four gates inform the cross — they do not replace it. Do not list four gate descriptions separately.

SECTION 3 — CONSCIOUS SUN AND EARTH AXIS (300 words minimum)
Interpret the Conscious Sun gate (Life's Work) and Conscious Earth gate (Evolution) as a unified embodiment axis. Include the Gene Keys Shadow, Gift, and Siddhi for the Life's Work gate only. Write the axis as what this person is here to embody and metabolize — not abstract concepts.

SECTION 4 — SIDEREAL ASCENDANT, SUN, AND MOON (300 words minimum)
Interpret the sidereal Lahiri Ascendant, Sun, and Moon using Whole Sign houses. Include the nakshatra for each placement. Write at classical Jyotish depth — not sun sign pop astrology. Include the currently active Mahadasha lord and what natal signatures it is activating.

SECTION 5 — INTEGRATED THREAD (200 words minimum)
Write one unified paragraph. Name the through-line where the HD Incarnation Cross, the Gene Keys Life's Work axis, and the Jyotish placements converge into a single statement of this person's life geometry. Be direct. No abstractions.

Generate all five sections now without stopping between them.`,
      },
    ],
  })

  const interpretation = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('')

  console.log(`[interpret] interpretation generated — ${interpretation.length} chars`)

  const tierColumn: TierColumn = `interpretation_t${tier}` as TierColumn

  if (chart_id) {
    await supabase
      .from('charts')
      .update({ [tierColumn]: interpretation, updated_at: new Date().toISOString() })
      .eq('id', chart_id)
  }

  return NextResponse.json({ interpretation })
}