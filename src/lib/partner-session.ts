import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { emailLinkSession } from '@/lib/partner-access'

export const SIGN_IN_REQUIRED = 'Please verify your email to continue'

// The signed-in Partner B, verified by Supabase Auth: getUser() asks the Auth
// server, getClaims() verifies the token that carries the sign-in method.
export async function verifiedPartner(): Promise<{ user: User; email: string } | { response: Response }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: claims } = await supabase.auth.getClaims()
  if (!user || !claims?.claims || claims.claims.sub !== user.id || !emailLinkSession(user, claims.claims.amr)) {
    return { response: NextResponse.json({ error: SIGN_IN_REQUIRED, code: 'sign_in' }, { status: 401 }) }
  }
  return { user, email: user.email!.toLowerCase() }
}
