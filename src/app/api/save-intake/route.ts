import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Returns the UTC offset in hours for a given birth time in an IANA timezone.
function getUtcOffsetHours(
  timezone: string,
  year: number, month: number, day: number,
  hour: number, minute: number
): number {
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, 0)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false,
  }).formatToParts(new Date(utcMs))
  const v = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0')
  const localMs = Date.UTC(v('year'), v('month') - 1, v('day'), v('hour') % 24, v('minute'), v('second'))
  return Math.round((localMs - utcMs) / 3600000 * 2) / 2
}

// Creates a chart row in Supabase for Person B / Child.
// Returns the chart ID.
async function createPersonBChart(
  userId: string,
  birthData: {
    name:    string
    date:    string  // YYYY-MM-DD
    time:    string  // HH:MM
    city:    string
    state:   string
    country: string
  },
  label: 'partner' | 'child'
): Promise<{ chartId: string; error?: string }> {
  const { name, date, time, city, state, country } = birthData

  // Geocode
  const geocodeQuery = [city, state, country].filter(Boolean).join(', ')
  const geocodeRes = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(geocodeQuery)}&format=json&limit=1`,
    { headers: { 'User-Agent': 'motorsui-frontend/1.0' } }
  )
  const geocodeData = await geocodeRes.json()
  if (!geocodeData.length) {
    return { chartId: '', error: `Location not found: ${geocodeQuery}` }
  }

  const latitude  = parseFloat(geocodeData[0].lat)
  const longitude = parseFloat(geocodeData[0].lon)

  // Timezone
  let timezone = 'UTC'
  try {
    const tzRes  = await fetch(
      `https://www.timeapi.io/api/timezone/coordinate?latitude=${latitude}&longitude=${longitude}`
    )
    const tzData = await tzRes.json()
    if (tzData.timeZone) timezone = tzData.timeZone
  } catch { /* fall back to UTC */ }

  // Parse birth date/time
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute]     = time.split(':').map(Number)
  const utc_offset         = getUtcOffsetHours(timezone, year, month, day, hour, minute)

  const birthPayload = { year, month, day, hour, minute, utc_offset, latitude, longitude }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.motorsui.com'

  // Calculate chart from MotorSui API
  const [hdRes, natalRes] = await Promise.all([
    fetch(`${apiUrl}/hd`,    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(birthPayload) }),
    fetch(`${apiUrl}/natal`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(birthPayload) }),
  ])

  if (!hdRes.ok || !natalRes.ok) {
    return { chartId: '', error: 'Chart calculation failed for Person B' }
  }

  const [hdData, natalData] = await Promise.all([hdRes.json(), natalRes.json()])

  const chart_json = {
    hd:    hdData,
    natal: natalData,
    birth: {
      name,
      birth_date:    date,
      birth_time:    time,
      birth_city:    city,
      birth_state:   state,
      birth_country: country,
      latitude,
      longitude,
      timezone,
      utc_offset,
    },
  }

  const adminSupa = createAdminClient()

  const { data: inserted, error: insertError } = await adminSupa
    .from('charts')
    .insert({ user_id: userId, chart_json, chart_label: label })
    .select('id')
    .single()

  if (insertError || !inserted) {
    console.error('[save-intake] failed to insert Person B chart:', insertError)
    return { chartId: '', error: 'Failed to store partner chart' }
  }

  return { chartId: inserted.id }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    formType: 'self' | 'relational' | 'parenting'
    chartId:  string
    answers:  Record<string, string>
  }

  const { formType, chartId, answers } = body

  if (!formType || !chartId || !answers) {
    return NextResponse.json({ error: 'formType, chartId, and answers are required' }, { status: 400 })
  }

  const adminSupa = createAdminClient()

  // Verify the chart belongs to this user
  const { data: chart, error: chartError } = await adminSupa
    .from('charts')
    .select('id, user_id')
    .eq('id', chartId)
    .single()

  if (chartError || !chart || chart.user_id !== user.id) {
    return NextResponse.json({ error: 'Chart not found' }, { status: 404 })
  }

  // ─── Self intake (Products 1-4) ───────────────────────────────────────────
  if (formType === 'self') {
    const { error: updateError } = await adminSupa
      .from('charts')
      .update({ intake_self: answers })
      .eq('id', chartId)

    if (updateError) {
      console.error('[save-intake] self update failed:', updateError)
      return NextResponse.json({ error: 'Failed to save intake' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  // ─── Relational intake (Products 5-6) ────────────────────────────────────
  if (formType === 'relational') {
    // Extract Person B birth data from answers
    const personBName    = answers['r_name']    ?? ''
    const personBDate    = answers['r_date']    ?? ''
    const personBTime    = answers['r_time']    ?? '12:00'
    const personBCity    = answers['r_city']    ?? ''
    const personBState   = answers['r_state']   ?? ''
    const personBCountry = answers['r_country'] ?? ''

    if (!personBName || !personBDate || !personBCity || !personBCountry) {
      return NextResponse.json({ error: 'Partner birth data is incomplete' }, { status: 400 })
    }

    // Check if partner chart already exists for this user
    const { data: existingPartner } = await adminSupa
      .from('charts')
      .select('id')
      .eq('user_id', user.id)
      .eq('chart_label', 'partner')
      .maybeSingle()

    let partnerChartId = existingPartner?.id ?? ''

    if (!partnerChartId) {
      const { chartId: newId, error: calcErr } = await createPersonBChart(
        user.id,
        { name: personBName, date: personBDate, time: personBTime, city: personBCity, state: personBState, country: personBCountry },
        'partner'
      )
      if (calcErr) return NextResponse.json({ error: calcErr }, { status: 500 })
      partnerChartId = newId
    }

    // Save intake + partner_chart_id to user's chart
    const { error: updateError } = await adminSupa
      .from('charts')
      .update({ intake_relational: answers, partner_chart_id: partnerChartId })
      .eq('id', chartId)

    if (updateError) {
      console.error('[save-intake] relational update failed:', updateError)
      return NextResponse.json({ error: 'Failed to save intake' }, { status: 500 })
    }

    return NextResponse.json({ success: true, partner_chart_id: partnerChartId })
  }

  // ─── Parenting intake (Products 7-8) ─────────────────────────────────────
  if (formType === 'parenting') {
    const childName    = answers['c_name']    ?? ''
    const childDate    = answers['c_date']    ?? ''
    const childTime    = answers['c_time']    ?? '12:00'
    const childCity    = answers['c_city']    ?? ''
    const childState   = answers['c_state']   ?? ''
    const childCountry = answers['c_country'] ?? ''

    if (!childName || !childDate || !childCity || !childCountry) {
      return NextResponse.json({ error: 'Child birth data is incomplete' }, { status: 400 })
    }

    // Check if child chart already exists for this user
    const { data: existingChild } = await adminSupa
      .from('charts')
      .select('id')
      .eq('user_id', user.id)
      .eq('chart_label', 'child')
      .maybeSingle()

    let childChartId = existingChild?.id ?? ''

    if (!childChartId) {
      const { chartId: newId, error: calcErr } = await createPersonBChart(
        user.id,
        { name: childName, date: childDate, time: childTime, city: childCity, state: childState, country: childCountry },
        'child'
      )
      if (calcErr) return NextResponse.json({ error: calcErr }, { status: 500 })
      childChartId = newId
    }

    const { error: updateError } = await adminSupa
      .from('charts')
      .update({ intake_parenting: answers, child_chart_id: childChartId })
      .eq('id', chartId)

    if (updateError) {
      console.error('[save-intake] parenting update failed:', updateError)
      return NextResponse.json({ error: 'Failed to save intake' }, { status: 500 })
    }

    return NextResponse.json({ success: true, child_chart_id: childChartId })
  }

  return NextResponse.json({ error: 'Unknown formType' }, { status: 400 })
}
