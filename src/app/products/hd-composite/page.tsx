import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HdCompositeProductClient from './HdCompositeProductClient'

export default async function HdCompositeProductPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier, purchased_products')
    .eq('id', user.id)
    .single()

  if (!profile?.purchased_products?.includes('hd_composite_report')) redirect('/products')

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
  const hasIntake = chart.intake_relational_complete === true

  let partnerChart = null
  let compositeRow = null

  if (chart.partner_chart_id) {
    const { data: pc } = await supabase.from('charts').select('*').eq('id', chart.partner_chart_id as string).maybeSingle()
    partnerChart = pc
    if (pc) {
      const { data: cr } = await supabase.from('hd_composite_interpretations').select('*').eq('chart_id_a', chart.id as string).eq('chart_id_b', pc.id as string).maybeSingle()
      compositeRow = cr
    }
  } else if (hasIntake) {
    const { data: pc } = await supabase.from('charts').select('*').eq('user_id', user.id).eq('chart_label', 'partner').maybeSingle()
    if (pc) {
      partnerChart = pc
      const { data: cr } = await supabase.from('hd_composite_interpretations').select('*').eq('chart_id_a', chart.id as string).eq('chart_id_b', pc.id as string).maybeSingle()
      compositeRow = cr
    }
  }

  return (
    <HdCompositeProductClient
      chart={chart as Record<string, unknown>}
      partnerChart={partnerChart as Record<string, unknown> | null}
      compositeRow={compositeRow as Record<string, unknown> & { chart_id_a: string; chart_id_b: string } | null}
      tier={tier}
      hasIntake={hasIntake}
      hasPartnerChart={!!partnerChart}
    />
  )
}
