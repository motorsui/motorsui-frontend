import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ParentingAstroProductClient from './ParentingAstroProductClient'

export default async function ParentingAstroProductPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier, purchased_products')
    .eq('id', user.id)
    .single()

  if (!profile?.purchased_products?.includes('parenting_astro_report')) redirect('/products')

  const { data: chart } = await supabase
    .from('charts')
    .select('*')
    .eq('user_id', user.id)
    .not('chart_label', 'in', '("partner","child")')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!chart) redirect('/charts')

  const tier = profile?.tier ?? 1
  const intake = chart.intake_parenting as Record<string, string> | null
  const hasIntake = !!intake && Object.keys(intake).length > 0

  let childChart = null

  if (chart.child_chart_id) {
    const { data: cc } = await supabase.from('charts').select('*').eq('id', chart.child_chart_id as string).maybeSingle()
    childChart = cc
  } else if (hasIntake) {
    const { data: cc } = await supabase.from('charts').select('*').eq('user_id', user.id).eq('chart_label', 'child').maybeSingle()
    childChart = cc
  }

  return (
    <ParentingAstroProductClient
      chart={chart as Record<string, unknown>}
      childChart={childChart as Record<string, unknown> | null}
      tier={tier}
      hasIntake={hasIntake}
      hasChildChart={!!childChart}
    />
  )
}
