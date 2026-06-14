import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe, tierForPrice } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { upsertContact } from '@/lib/ghl'

// Stripe requires the raw body for signature verification.
// Next.js App Router exposes it via request.text().
export async function POST(request: NextRequest) {
  const sig    = request.headers.get('stripe-signature') ?? ''
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!secret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const body = await request.text()

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret)
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session  = event.data.object as Stripe.Checkout.Session
  const userId   = session.metadata?.user_id   ?? session.client_reference_id
  const priceId  = session.metadata?.price_id  ?? ''
  const email    = session.customer_email      ?? ''

  if (!userId) {
    console.error('[stripe/webhook] no user_id in session metadata')
    return NextResponse.json({ error: 'No user_id' }, { status: 400 })
  }

  const tier       = tierForPrice(priceId)
  const adminSupa  = createAdminClient()

  // Grant tier access in Supabase
  const { error: updateError } = await adminSupa
    .from('profiles')
    .update({ tier })
    .eq('id', userId)

  if (updateError) {
    console.error('[stripe/webhook] profile tier update failed:', updateError)
    return NextResponse.json({ error: 'Profile update failed' }, { status: 500 })
  }

  console.log(`[stripe/webhook] tier ${tier} granted — user=${userId} price=${priceId}`)

  // Tag GHL contact as paid — triggers paid workflow in GHL if configured
  if (email) {
    upsertContact({ email, extraTags: ['motorsui-paid'] }).catch(() => {})
  }

  return NextResponse.json({ received: true })
}
