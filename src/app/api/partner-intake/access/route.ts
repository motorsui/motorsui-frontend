import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  activeInvitationsForEmail,
  clientIp,
  normalizeEmail,
  partnerRedirectUrl,
  rateLimited,
  sendPartnerSignInLink,
} from '@/lib/partner-access'
import { lovingByDesignClosed } from '@/lib/product-availability'

// Partner B asks for a new sign-in link (new device, cleared cookies, expired
// link). A link is sent only to an address holding an active invitation, and
// the reply is the same either way so addresses cannot be probed.

const SENT = 'If this email address has an active invitation, a sign-in link is on its way.'
const HOUR = 60 * 60 * 1000

export async function POST(request: NextRequest) {
  const closed = lovingByDesignClosed()
  if (closed) return closed
  const body = await request.json().catch(() => ({})) as { email?: unknown }
  const email = normalizeEmail(body.email)
  if (!email) return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })

  const admin = createAdminClient()
  if (await rateLimited(admin, 'access-ip', clientIp(request.headers), 20, HOUR) ||
      await rateLimited(admin, 'access-email', email, 3, HOUR)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  if ((await activeInvitationsForEmail(admin, email)).length > 0) {
    const status = await sendPartnerSignInLink(email, partnerRedirectUrl(request.headers))
    if (status >= 400) console.error('[partner-intake/access] sign-in link not sent, auth status', status)
  }
  return NextResponse.json({ message: SENT })
}
