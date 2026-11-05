import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { partnerIntakeSubmitted } from '@/lib/partner-access'
import { LOVING_BY_DESIGN_AVAILABLE, LOVING_BY_DESIGN_READINGS_AVAILABLE } from '@/lib/product-availability'
import SynastryProductClient from './SynastryProductClient'

export default async function SynastryProductPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!LOVING_BY_DESIGN_AVAILABLE) redirect('/products')

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier, purchased_products')
    .eq('id', user.id)
    .single()

  if (!profile?.purchased_products?.includes('synastry_report')) redirect('/products')

  // Exclude partner/child charts — user's own chart is label='self' or null (pre-migration)
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

  // Fetch partner chart if it exists. Both chart ids come from the caller's own
  // rows; the pair row itself is RLS-locked and read with the admin client.
  // Only the partner chart's id reaches the client.
  let partnerChart = null
  let synastryRow = null

  if (chart.partner_chart_id) {
    const { data: pc } = await supabase
      .from('charts')
      .select('id')
      .eq('id', chart.partner_chart_id as string)
      .maybeSingle()
    partnerChart = pc

    if (pc) {
      const { data: sr } = await createAdminClient()
        .from('synastry_interpretations')
        .select('*')
        .eq('chart_id_a', chart.id as string)
        .eq('chart_id_b', pc.id as string)
        .maybeSingle()
      synastryRow = sr
    }
  } else if (hasIntake) {
    // Intake was saved but partner_chart_id not on this chart row yet — look up by chart_label
    const { data: pc } = await supabase
      .from('charts')
      .select('id')
      .eq('user_id', user.id)
      .eq('chart_label', 'partner')
      .maybeSingle()
    if (pc) {
      partnerChart = pc
      const { data: sr } = await createAdminClient()
        .from('synastry_interpretations')
        .select('*')
        .eq('chart_id_a', chart.id as string)
        .eq('chart_id_b', pc.id as string)
        .maybeSingle()
      synastryRow = sr
    }
  }

  // Only whether the partner has submitted reaches the client, never their answers.
  const partnerIntakeComplete = partnerChart
    ? await partnerIntakeSubmitted(createAdminClient(), String((partnerChart as { id: unknown }).id))
    : false

  return (
    <SynastryProductClient
      chart={chart as Record<string, unknown>}
      partnerChart={partnerChart as Record<string, unknown> | null}
      synastryRow={synastryRow as Record<string, unknown> & { chart_id_a: string; chart_id_b: string } | null}
      tier={tier}
      hasIntake={hasIntake}
      hasPartnerChart={!!partnerChart}
      partnerIntakeComplete={partnerIntakeComplete}
      readingsAvailable={LOVING_BY_DESIGN_READINGS_AVAILABLE}
    />
  )
}
