import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NatalProductClient from './NatalProductClient'

export default async function NatalProductPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single()

  const { data: chart } = await supabase
    .from('charts')
    .select('*')
    .eq('user_id', user.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!chart) redirect('/charts')

  const tier = profile?.tier ?? 1

  return (
    <NatalProductClient
      chart={chart as Record<string, unknown>}
      tier={tier}
    />
  )
}
