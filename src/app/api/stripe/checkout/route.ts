import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe, allPriceIds } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { priceId?: string }
  const { priceId } = body

  if (!priceId) {
    return NextResponse.json({ error: 'priceId required' }, { status: 400 })
  }

  const allowed = allPriceIds()
  if (allowed.length > 0 && !allowed.includes(priceId)) {
    return NextResponse.json({ error: 'Unknown price' }, { status: 400 })
  }

  const origin = request.headers.get('origin') ?? 'https://motorsui.com'

  try {
    const stripe  = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode:                'payment',
      line_items:          [{ price: priceId, quantity: 1 }],
      customer_email:      user.email,
      client_reference_id: user.id,
      success_url:         `${origin}/products/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:          `${origin}/products`,
      metadata: {
        user_id:  user.id,
        price_id: priceId,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/checkout] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Checkout creation failed' },
      { status: 500 }
    )
  }
}
