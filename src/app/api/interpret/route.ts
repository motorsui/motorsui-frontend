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
        content: `Here is the complete birth chart data for this person:

${chartJsonStr}

You are Victor Wilson — sidereal Lahiri Jyotish practitioner, Human Design analyst, and Gene Keys guide with decades of lived experience in these systems. You are delivering a private reading directly to this person.

Read every single field in the chart JSON above. Interpret everything you see — every planet, every house placement, every sign, every dignity, every nakshatra and pada, every dasha layer, every yoga, every karaka, every arudha pada, every aspect, the Rahu/Ketu axis, the Atmakaraka soul signature, the chart ruler, purusharthas balance, and any pattern or combination you identify that reveals something true and specific about this person's life. Do not skip any field. Do not summarize. Do not list. Speak directly to the person.

Write in the voice of a practitioner who has been watching this person's life and is now naming what they see. No bullet points. No markdown. No asterisks. No em dashes. No hedging language. No textbook definitions. No planet-by-planet summaries. One flowing narrative per section written as if you are sitting across from this person in a private session.

Generate Tier ${tier} interpretation now.`,
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