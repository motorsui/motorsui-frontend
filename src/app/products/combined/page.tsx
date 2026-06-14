import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CombinedProductClient from './CombinedProductClient'

export default async function CombinedProductPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier, purchased_products')
    .eq('id', user.id)
    .single()

  if (!profile?.purchased_products?.includes('combined_report')) redirect('/products')

  const { data: chart } = await supabase
    .from('charts')
    .select('*')
    .eq('user_id', user.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!chart) redirect('/charts')

  const tier = profile?.tier ?? 1
  const intake = chart.intake_self as Record<string, string> | null
  const hasIntake = !!intake && Object.keys(intake).length > 0

  return <CombinedProductClient chart={chart as Record<string, unknown>} tier={tier} hasIntake={hasIntake} />
}
