import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import ChartClient from './ChartClient'

export default async function ChartsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: chart } = await supabase
    .from('charts')
    .select('id, chart_json, interpretation_t1, interpretation_t2, interpretation_t3, generated_at')
    .eq('user_id', user.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const tier = profile?.tier ?? 1

  return (
    <div className="min-h-screen bg-[#f4f1e8]">
      <Header />
      <ChartClient profile={profile} chart={chart} tier={tier} />
    </div>
  )
}
