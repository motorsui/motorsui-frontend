import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Returns the UTC offset in hours that was in effect at the given local birth time,
// using the IANA timezone database via Intl — correctly handles historical DST.
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
  // Round to nearest 0.5 to handle half-hour timezone offsets (e.g. India UTC+5:30)
  return Math.round((localMs - utcMs) / 3600000 * 2) / 2
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { birth_date, birth_time, birth_city, birth_state, birth_country } = body

  // Geocode city/state/country → lat/lon
  const geocodeQuery = [birth_city, birth_state, birth_country].filter(Boolean).join(', ')
  const geocodeRes = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(geocodeQuery)}&format=json&limit=1`,
    { headers: { 'User-Agent': 'motorsui-frontend/1.0' } }
  )
  const geocodeData = await geocodeRes.json()

  if (!geocodeData.length) {
    return NextResponse.json({ error: `Location not found: ${geocodeQuery}` }, { status: 400 })
  }

  const latitude  = parseFloat(geocodeData[0].lat)
  const longitude = parseFloat(geocodeData[0].lon)

  // Get IANA timezone name from coordinates
  let timezone = 'UTC'
  try {
    const tzRes = await fetch(
      `https://www.timeapi.io/api/timezone/coordinate?latitude=${latitude}&longitude=${longitude}`
    )
    const tzData = await tzRes.json()
    if (tzData.timeZone) timezone = tzData.timeZone
  } catch {
    // Fall back to UTC if timezone lookup fails
  }

  // Parse birth date and time
  const [year, month, day] = birth_date.split('-').map(Number)
  const [hour, minute]     = birth_time.split(':').map(Number)

  // Compute historical UTC offset for the birth date/time in the resolved timezone
  const utc_offset = getUtcOffsetHours(timezone, year, month, day, hour, minute)

  const birthPayload = { year, month, day, hour, minute, utc_offset, latitude, longitude }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.motorsui.com'

  // Call HD and natal endpoints in parallel
  const [hdRes, natalRes] = await Promise.all([
    fetch(`${apiUrl}/hd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(birthPayload),
    }),
    fetch(`${apiUrl}/natal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(birthPayload),
    }),
  ])

  if (!hdRes.ok || !natalRes.ok) {
    const hdErr    = !hdRes.ok    ? await hdRes.text()    : ''
    const natalErr = !natalRes.ok ? await natalRes.text() : ''
    console.error('HD error:', hdErr, '| Natal error:', natalErr)
    return NextResponse.json(
      { error: 'Chart calculation failed', detail: hdErr || natalErr },
      { status: 500 }
    )
  }

  const [hdData, natalData] = await Promise.all([hdRes.json(), natalRes.json()])

  const chart_json = {
    hd:    hdData,
    natal: natalData,
    birth: { birth_date, birth_time, birth_city, birth_state, birth_country, latitude, longitude, timezone, utc_offset },
  }

  // Upsert chart row
  let chartId: string | undefined

  const { data: existing } = await supabase
    .from('charts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('charts')
      .update({ chart_json, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    chartId = existing.id
  } else {
    const { data: inserted } = await supabase
      .from('charts')
      .insert({ user_id: user.id, chart_json })
      .select('id')
      .single()
    chartId = inserted?.id
  }

  return NextResponse.json({ chart_json, chart_id: chartId })
}
