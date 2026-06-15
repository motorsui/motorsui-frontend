import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { upsertContact } from '@/lib/ghl'

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

  // Call HD, natal, and evidence endpoints in parallel.
  // Evidence is non-fatal — chart creation succeeds even if evidence fails.
  const [hdRes, natalRes, evidenceRes] = await Promise.all([
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
    fetch(`${apiUrl}/natal/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birth: birthPayload }),
    }).catch(() => null),
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
  const evidence_objects = (evidenceRes && evidenceRes.ok)
    ? await evidenceRes.json().catch(() => null)
    : null

  const chart_json = {
    hd:    hdData,
    natal: natalData,
    birth: { birth_date, birth_time, birth_city, birth_state, birth_country, latitude, longitude, timezone, utc_offset },
  }

  const adminSupabase = createAdminClient()

  // Ensure a profile row exists (guards against users who bypassed normal registration)
  await adminSupabase
    .from('profiles')
    .upsert(
      { id: user.id, email: user.email ?? '', first_name: '', last_name: '' },
      { onConflict: 'id', ignoreDuplicates: true }
    )

  // Upsert chart row
  let chartId: string | undefined

  const { data: existing } = await adminSupabase
    .from('charts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    await adminSupabase
      .from('charts')
      .update({ chart_json, evidence_objects, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    chartId = existing.id
  } else {
    const { data: inserted, error: insertError } = await adminSupabase
      .from('charts')
      .insert({ user_id: user.id, chart_json, evidence_objects })
      .select('id')
      .single()
    if (insertError) console.error('[chart] insert error:', insertError)
    chartId = inserted?.id
  }

  // Fetch profile for name data to include in GHL contact
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('first_name, last_name, cell, birth_time')
    .eq('id', user.id)
    .maybeSingle()

  // Upsert GHL contact — ensures users who skip birth data at registration
  // are still captured in the funnel when they enter it here.
  upsertContact({
    firstName:    String(profile?.first_name || ''),
    lastName:     String(profile?.last_name  || ''),
    email:        user.email ?? '',
    phone:        profile?.cell     ? String(profile.cell)      : undefined,
    birthDate:    birth_date        || undefined,
    birthTime:    profile?.birth_time ? String(profile.birth_time) : birth_time || undefined,
    birthCity:    birth_city        || undefined,
    birthState:   birth_state       || undefined,
    birthCountry: birth_country     || undefined,
  }).catch(() => {})

  return NextResponse.json({ chart_json, chart_id: chartId })
}
