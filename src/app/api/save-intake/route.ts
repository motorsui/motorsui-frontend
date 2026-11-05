import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { lovingByDesignClosed } from '@/lib/product-availability'
import {
  PARENTING_QUESTIONNAIRE_VERSION,
  RELATIONAL_QUESTIONNAIRE_VERSION,
  SELF_QUESTIONNAIRE_VERSION,
  missingParentingAnswers,
  missingRelationalAnswers,
  missingSelfAnswers,
  parentingIntakeVersion,
  relationalIntakeVersion,
  selfIntakeVersion,
  toParentingSubmission,
  toRelationalSubmission,
  toSelfSubmission,
} from '@/lib/intake-questions'

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
): Promise<{ chartId: string; error?: string; status?: number }> {
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

  // Timezone (no UTC fallback: a wrong offset would silently store a wrong chart)
  let timezone = ''
  try {
    const tzRes  = await fetch(
      `https://www.timeapi.io/api/timezone/coordinate?latitude=${latitude}&longitude=${longitude}`
    )
    const tzData = tzRes.ok ? await tzRes.json() : null
    if (typeof tzData?.timeZone === 'string') timezone = tzData.timeZone
  } catch { /* handled below */ }
  if (!timezone) return { chartId: '', error: 'Timezone lookup failed. Please try again.', status: 502 }

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
    // One submitted intake per chart, shared by Products 1-4; an intake begun
    // on an earlier version is never overwritten.
    const { data: current } = await adminSupa
      .from('charts')
      .select('intake_self, intake_self_complete')
      .eq('id', chartId)
      .single()
    if (current?.intake_self_complete === true) {
      return NextResponse.json({ error: 'Intake already submitted' }, { status: 409 })
    }
    const storedVersion = selfIntakeVersion(current?.intake_self)
    if (storedVersion && storedVersion !== SELF_QUESTIONNAIRE_VERSION) {
      return NextResponse.json({ error: 'Intake was started on an earlier questionnaire version' }, { status: 409 })
    }
    if (missingSelfAnswers(answers).length > 0) {
      return NextResponse.json({ error: 'Required questions are unanswered' }, { status: 400 })
    }

    const { error: updateError } = await adminSupa
      .from('charts')
      .update({ intake_self: toSelfSubmission(answers), intake_self_complete: true })
      .eq('id', chartId)

    if (updateError) {
      console.error('[save-intake] self update failed:', updateError)
      return NextResponse.json({ error: 'Failed to save intake' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  // ─── Relational intake (Products 5-6) ────────────────────────────────────
  if (formType === 'relational') {
    const closed = lovingByDesignClosed()
    if (closed) return closed
    // One submitted intake per purchaser chart; an intake begun on an earlier
    // version is never overwritten. The partner's own row is written only
    // through their share link, never from here.
    const { data: current } = await adminSupa
      .from('charts')
      .select('chart_label, intake_relational, intake_relational_complete')
      .eq('id', chartId)
      .single()
    if (current?.chart_label === 'partner' || current?.chart_label === 'child') {
      return NextResponse.json({ error: 'Chart not found' }, { status: 404 })
    }
    if (current?.intake_relational_complete === true) {
      return NextResponse.json({ error: 'Intake already submitted' }, { status: 409 })
    }
    const storedVersion = relationalIntakeVersion(current?.intake_relational)
    if (storedVersion && storedVersion !== RELATIONAL_QUESTIONNAIRE_VERSION) {
      return NextResponse.json({ error: 'Intake was started on an earlier questionnaire version' }, { status: 409 })
    }
    if (missingRelationalAnswers(answers).length > 0) {
      return NextResponse.json({ error: 'Required questions are unanswered' }, { status: 400 })
    }

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
      const { chartId: newId, error: calcErr, status: calcStatus } = await createPersonBChart(
        user.id,
        { name: personBName, date: personBDate, time: personBTime, city: personBCity, state: personBState, country: personBCountry },
        'partner'
      )
      if (calcErr) return NextResponse.json({ error: calcErr }, { status: calcStatus ?? 500 })
      partnerChartId = newId
    }

    // Save intake + partner_chart_id to user's chart.
    // intake_relational_complete gates Products 5-6 — set only on final submit, not autosave.
    const { error: updateError } = await adminSupa
      .from('charts')
      .update({ intake_relational: toRelationalSubmission(answers, true), intake_relational_complete: true, partner_chart_id: partnerChartId })
      .eq('id', chartId)

    if (updateError) {
      console.error('[save-intake] relational update failed:', updateError)
      return NextResponse.json({ error: 'Failed to save intake' }, { status: 500 })
    }

    return NextResponse.json({ success: true, partner_chart_id: partnerChartId })
  }

  // ─── Parenting intake (Products 7-8) ─────────────────────────────────────
  if (formType === 'parenting') {
    // One submitted intake per parent row: a resubmit (or a second child) must not
    // replace it, and an intake begun on an earlier version is never overwritten.
    const { data: current } = await adminSupa
      .from('charts')
      .select('intake_parenting, intake_parenting_complete')
      .eq('id', chartId)
      .single()
    if (current?.intake_parenting_complete === true) {
      return NextResponse.json({ error: 'Intake already submitted' }, { status: 409 })
    }
    const storedVersion = parentingIntakeVersion(current?.intake_parenting)
    if (storedVersion && storedVersion !== PARENTING_QUESTIONNAIRE_VERSION) {
      return NextResponse.json({ error: 'Intake was started on an earlier questionnaire version' }, { status: 409 })
    }
    if (missingParentingAnswers(answers).length > 0) {
      return NextResponse.json({ error: 'Required questions are unanswered' }, { status: 400 })
    }

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
      const { chartId: newId, error: calcErr, status: calcStatus } = await createPersonBChart(
        user.id,
        { name: childName, date: childDate, time: childTime, city: childCity, state: childState, country: childCountry },
        'child'
      )
      if (calcErr) return NextResponse.json({ error: calcErr }, { status: calcStatus ?? 500 })
      childChartId = newId
    }

    // intake_parenting_complete gates Products 7-8 — set only on final submit, not autosave.
    const { error: updateError } = await adminSupa
      .from('charts')
      .update({ intake_parenting: toParentingSubmission(answers), intake_parenting_complete: true, child_chart_id: childChartId })
      .eq('id', chartId)

    if (updateError) {
      console.error('[save-intake] parenting update failed:', updateError)
      return NextResponse.json({ error: 'Failed to save intake' }, { status: 500 })
    }

    return NextResponse.json({ success: true, child_chart_id: childChartId })
  }

  return NextResponse.json({ error: 'Unknown formType' }, { status: 400 })
}
