import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Mirrors chart/route.ts — resolves historical UTC offset from IANA timezone and birth datetime.
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

export async function POST(request: NextRequest) {
  const body = await request.json()

  const {
    first_name,
    last_name,
    email,
    password,
    cell,
    birth_city,
    birth_state,
    birth_country,
    birth_date,
    birth_time,
    current_city,
    current_state,
    current_country,
  } = body

  if (!email || !password || !first_name || !last_name) {
    return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 })
  }

  // ── 1. CREATE AUTH USER ──────────────────────────────────────────────────────
  // Cookie client so the session is written to the response headers.
  const supabase     = await createClient()
  const adminSupabase = createAdminClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }
  if (!authData.user) {
    return NextResponse.json({ error: 'Registration failed — no user returned.' }, { status: 500 })
  }

  const userId = authData.user.id

  // ── 2. INSERT PROFILE ────────────────────────────────────────────────────────
  const { error: profileError } = await adminSupabase
    .from('profiles')
    .insert({
      id:             userId,
      email,
      first_name,
      last_name,
      cell:           cell           ?? null,
      birth_city:     birth_city     ?? null,
      birth_state:    birth_state    ?? null,
      birth_country:  birth_country  ?? null,
      birth_date:     birth_date     ?? null,
      birth_time:     birth_time     ?? null,
      current_city:   current_city   ?? null,
      current_state:  current_state  ?? null,
      current_country: current_country ?? null,
    })

  if (profileError) {
    console.error('[register] profile insert error:', profileError)
    return NextResponse.json({ error: 'Profile creation failed.' }, { status: 500 })
  }

  // ── 3. GEOCODE + CALCULATE CHART ─────────────────────────────────────────────
  // Non-fatal — if chart calculation fails the account is still created and the
  // user can recalculate from the chart page.
  let chart_id: string | undefined

  if (birth_city && birth_date && birth_time) {
    try {
      // Geocode city/state/country → lat/lon via Nominatim
      const geocodeQuery = [birth_city, birth_state, birth_country].filter(Boolean).join(', ')
      const geocodeRes   = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(geocodeQuery)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'motorsui-frontend/1.0' } }
      )
      const geocodeData = await geocodeRes.json()

      if (!geocodeData.length) {
        throw new Error(`Birth location not found: ${geocodeQuery}`)
      }

      const latitude  = parseFloat(geocodeData[0].lat)
      const longitude = parseFloat(geocodeData[0].lon)

      // Resolve IANA timezone from coordinates via TimeAPI
      let timezone = 'UTC'
      try {
        const tzRes  = await fetch(
          `https://www.timeapi.io/api/timezone/coordinate?latitude=${latitude}&longitude=${longitude}`
        )
        const tzData = await tzRes.json()
        if (tzData.timeZone) timezone = tzData.timeZone
      } catch {
        // Falls back to UTC — chart will still calculate with reduced DST accuracy
      }

      // Parse birth date + time, compute historical UTC offset
      const [year, month, day] = birth_date.split('-').map(Number)
      const [hour, minute]     = birth_time.split(':').map(Number)
      const utc_offset = getUtcOffsetHours(timezone, year, month, day, hour, minute)

      const birthPayload = { year, month, day, hour, minute, utc_offset, latitude, longitude }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.motorsui.com'

      // Calculate HD and natal in parallel
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
        const detail = !hdRes.ok ? await hdRes.text() : await natalRes.text()
        console.error('[register] chart API error:', detail)
        throw new Error('Chart calculation failed')
      }

      const [hdData, natalData] = await Promise.all([hdRes.json(), natalRes.json()])

      const chart_json = {
        hd:    hdData,
        natal: natalData,
        birth: {
          birth_date, birth_time,
          birth_city, birth_state, birth_country,
          latitude, longitude, timezone, utc_offset,
        },
      }

      const { data: inserted, error: chartError } = await adminSupabase
        .from('charts')
        .insert({ user_id: userId, chart_json })
        .select('id')
        .single()

      if (chartError) {
        console.error('[register] chart insert error:', chartError)
      } else {
        chart_id = inserted?.id
      }
    } catch (err) {
      console.error('[register] chart calculation skipped:', err)
    }
  }

  return NextResponse.json({ success: true, chart_id })
}
