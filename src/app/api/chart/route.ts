import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  const lat = parseFloat(geocodeData[0].lat)
  const lon = parseFloat(geocodeData[0].lon)

  // Get timezone from coordinates
  let timezone = 'UTC'
  try {
    const tzRes = await fetch(
      `https://www.timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lon}`
    )
    const tzData = await tzRes.json()
    if (tzData.timeZone) timezone = tzData.timeZone
  } catch {
    // Fall back to UTC if timezone lookup fails
  }

  // Parse date and time
  const [year, month, day] = birth_date.split('-').map(Number)
  const [hour, minute] = birth_time.split(':').map(Number)

  const birthPayload = { year, month, day, hour, minute, lat, lon, tz: timezone }

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
    const hdErr = !hdRes.ok ? await hdRes.text() : ''
    const natalErr = !natalRes.ok ? await natalRes.text() : ''
    return NextResponse.json(
      { error: 'Chart calculation failed', detail: hdErr || natalErr },
      { status: 500 }
    )
  }

  const [hdData, natalData] = await Promise.all([hdRes.json(), natalRes.json()])

  const chart_json = {
    hd: hdData,
    natal: natalData,
    birth: { birth_date, birth_time, birth_city, birth_state, birth_country, lat, lon, timezone },
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
