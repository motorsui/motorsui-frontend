import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'

const tierLabels: Record<number, string> = {
  1: 'Free',
  2: 'Paid',
  3: 'Full Access',
}

export default async function DashboardPage() {
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
    .select('id, generated_at')
    .eq('user_id', user.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const tier = profile?.tier ?? 1

  return (
    <div className="min-h-screen bg-[#f4f1e8]">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-16">

        <div className="mb-10">
          <h1 className="font-[family-name:var(--font-playfair)] text-4xl text-[#1e1a18] mb-2">
            Welcome, {profile?.first_name ?? 'Friend'}.
          </h1>
          <p className="font-[family-name:var(--font-cormorant)] text-lg text-[#1e1a18]/60">
            Tier {tier} — {tierLabels[tier]}
          </p>
        </div>

        <div className="border border-[#c4a96a]/40 rounded p-8">
          {chart ? (
            <>
              <p className="font-[family-name:var(--font-raleway)] text-xs font-semibold text-[#9a7c2e] uppercase tracking-widest mb-2">
                Your Chart
              </p>
              <p className="font-[family-name:var(--font-cormorant)] text-base text-[#1e1a18]/60 mb-6">
                Generated{' '}
                {new Date(chart.generated_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <Link href="/charts">
                <Button variant="primary" size="md">View Chart</Button>
              </Link>
            </>
          ) : (
            <>
              <p className="font-[family-name:var(--font-raleway)] text-xs font-semibold text-[#9a7c2e] uppercase tracking-widest mb-2">
                No Chart Yet
              </p>
              <p className="font-[family-name:var(--font-cormorant)] text-lg text-[#1e1a18] mb-6">
                Generate your sidereal chart to begin.
              </p>
              <Link href="/charts/generate">
                <Button variant="primary" size="md">Generate Your Chart</Button>
              </Link>
            </>
          )}
        </div>

      </main>
    </div>
  )
}
