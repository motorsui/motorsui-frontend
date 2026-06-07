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

  // Fetch all four governing documents in parallel
  const [systemDoc, coreDoc, astroDoc, hdDoc] = await Promise.all(
    CLAUDE_DOCS.map(url => fetch(url).then(r => r.text()))
  )

  // Inject session parameters into CLAUDE_SYSTEM.md
  // Inject session parameters into the system prompt template
  let systemPrompt = systemDoc
  systemPrompt = systemPrompt.replace('[TIER_1 / TIER_2 / TIER_3]', `TIER_${tier}`)
  systemPrompt = systemPrompt.replace('[USER_NAME]', user.email ?? 'User')
  systemPrompt = systemPrompt.replace('[CHART_JSON]', JSON.stringify(chart_json, null, 2))
  systemPrompt = systemPrompt.replace('[TRUE / FALSE]', 'FALSE')

  // Replace multiline template placeholders without dotAll regex
  const intakeStart = systemPrompt.indexOf('[INTAKE_JSON')
  const intakeEnd   = systemPrompt.indexOf(']', intakeStart)
  if (intakeStart !== -1 && intakeEnd !== -1) {
    systemPrompt = systemPrompt.slice(0, intakeStart) + 'N/A' + systemPrompt.slice(intakeEnd + 1)
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

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: fullSystemPrompt,
    messages: [
      {
        role: 'user',
        content: `Generate the Tier ${tier} interpretation for this chart. Begin when ready.`,
      },
    ],
  })

  const interpretation = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('')

  // Store interpretation in the correct tier column
  const tierColumn: TierColumn = `interpretation_t${tier}` as TierColumn

  if (chart_id) {
    await supabase
      .from('charts')
      .update({ [tierColumn]: interpretation, updated_at: new Date().toISOString() })
      .eq('id', chart_id)
  }

  return NextResponse.json({ interpretation })
}
