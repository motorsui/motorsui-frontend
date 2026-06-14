import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe, productForPrice } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { upsertContact } from '@/lib/ghl'

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

  const session    = event.data.object as Stripe.Checkout.Session
  const userId     = session.metadata?.user_id   ?? session.client_reference_id
  const priceId    = session.metadata?.price_id  ?? ''
  const email      = session.customer_email      ?? ''
  const productKey = productForPrice(priceId)

  if (!userId) {
    console.error('[stripe/webhook] no user_id in session metadata')
    return NextResponse.json({ error: 'No user_id' }, { status: 400 })
  }

  if (!productKey) {
    console.error('[stripe/webhook] unrecognised price_id:', priceId)
    return NextResponse.json({ error: 'Unknown price_id' }, { status: 400 })
  }

  const adminSupa = createAdminClient()

  // Fetch current purchased_products and append the new key (idempotent)
  const { data: profile, error: fetchError } = await adminSupa
    .from('profiles')
    .select('purchased_products')
    .eq('id', userId)
    .single()

  if (fetchError) {
    console.error('[stripe/webhook] profile fetch failed:', fetchError)
    return NextResponse.json({ error: 'Profile fetch failed' }, { status: 500 })
  }

  const current = (profile?.purchased_products as string[] | null) ?? []
  if (!current.includes(productKey)) {
    current.push(productKey)
  }

  const { error: updateError } = await adminSupa
    .from('profiles')
    .update({ purchased_products: current })
    .eq('id', userId)

  if (updateError) {
    console.error('[stripe/webhook] profile update failed:', updateError)
    return NextResponse.json({ error: 'Profile update failed' }, { status: 500 })
  }

  console.log(`[stripe/webhook] granted ${productKey} — user=${userId}`)

  if (email) {
    upsertContact({ email, extraTags: ['motorsui-paid'] }).catch(() => {})
  }

  return NextResponse.json({ received: true })
}
