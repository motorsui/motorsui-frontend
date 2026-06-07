import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const body = await request.json()

  const {
    email,
    password,
    first_name,
    last_name,
    cell,
    birth_city,
    birth_state,
    birth_country,
    birth_date,
    birth_time,
    current_city,
    current_state,
    current_country,
    sms_consent,
  } = body

  // Auth signup via SSR client (handles session cookies)
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  if (!authData.user) {
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 400 })
  }

  // Profile insert via service role — bypasses RLS so this succeeds before email confirmation
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error: profileError } = await admin.from('profiles').insert({
    id: authData.user.id,
    email,
    first_name,
    last_name,
    cell,
    birth_city,
    birth_state,
    birth_country,
    birth_date,
    birth_time,
    current_city,
    current_state,
    current_country,
    sms_consent: sms_consent ?? false,
  })

  if (profileError) {
    console.error('Profile insert error:', profileError.message)
  }

  // GHL contact creation — fire and forget, never blocks registration
  const webhookUrl = process.env.GHL_WEBHOOK_URL
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: first_name,
        lastName: last_name,
        email,
        phone: cell,
        city: current_city,
        state: current_state,
        country: current_country,
        tags: ['motorsui-registration', 'tier-1'],
        smsConsent: sms_consent ?? false,
        source: 'MotorSui Registration',
      }),
    }).catch(err => console.error('GHL webhook error:', err))
  }

  return NextResponse.json({ success: true })
}
