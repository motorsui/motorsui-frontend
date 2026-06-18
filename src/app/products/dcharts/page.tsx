import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DchartsProductClient from './DchartsProductClient'

export default async function DchartsProductPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier, purchased_products')
    .eq('id', user.id)
    .single()

  if (!profile?.purchased_products?.includes('divcharts_report')) redirect('/products')

  const { data: chart } = await supabase
    .from('charts')
    .select('*')
    .eq('user_id', user.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!chart) redirect('/charts')

  const tier = profile?.tier ?? 1
  const hasIntake = chart.intake_self_complete === true

  return <DchartsProductClient chart={chart as Record<string, unknown>} tier={tier} hasIntake={hasIntake} />
}
