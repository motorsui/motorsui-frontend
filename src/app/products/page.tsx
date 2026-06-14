import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'

export default async function ProductsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: chart } = await supabase
    .from('charts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!chart) redirect('/charts')

  const row  = 'border border-[#c4a96a]/30 rounded p-8 flex flex-col gap-4'
  const tag  = 'font-[family-name:var(--font-raleway)] text-[10px] font-semibold tracking-[0.14em] uppercase'
  const h2   = 'font-[family-name:var(--font-playfair)] text-2xl text-[#1e1a18]'
  const body = 'font-[family-name:var(--font-cormorant)] text-base text-[#1e1a18]/70 leading-relaxed'

  return (
    <div className="min-h-screen bg-[#f4f1e8]">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-16">

        <div className="mb-12">
          <p className={`${tag} text-[#9a7c2e] mb-2`}>MotorSui</p>
          <h1 className="font-[family-name:var(--font-playfair)] text-4xl text-[#1e1a18] mb-3">
            Your Chart is Ready
          </h1>
          <p className={body}>
            Select a reading below. Free sections generate on first visit.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

          {/* Natal Chart Reading — free */}
          <div className={row}>
            <div>
              <p className={`${tag} text-[#9a7c2e] mb-3`}>Free · Included</p>
              <h2 className={h2}>Natal Chart Reading</h2>
            </div>
            <p className={body}>
              Sidereal Lahiri natal chart with full planetary placements,
              nakshatras, dignities, Vimshottari Dasha timeline, and Purusharthas.
            </p>
            <Link
              href="/products/natal"
              className="self-start mt-2 inline-block font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.14em] uppercase bg-[#9a7c2e] text-[#f4f1e8] px-5 py-2.5 rounded hover:bg-[#b8962e] transition-colors"
            >
              View Reading
            </Link>
          </div>

          {/* Human Design Reading — coming soon */}
          <div className={`${row} opacity-50 cursor-not-allowed select-none`}>
            <div>
              <p className={`${tag} text-[#9a7c2e]/60 mb-3`}>Coming Soon</p>
              <h2 className={`${h2} text-[#1e1a18]/50`}>Human Design Reading</h2>
            </div>
            <p className={`${body} text-[#1e1a18]/40`}>
              Full sidereal Human Design report: Type, Strategy, Authority,
              Profile, Incarnation Cross, Centers, Channels, and Variables.
            </p>
          </div>

          {/* D-Chart Suite — coming soon */}
          <div className={`${row} opacity-50 cursor-not-allowed select-none`}>
            <div>
              <p className={`${tag} text-[#9a7c2e]/60 mb-3`}>Coming Soon</p>
              <h2 className={`${h2} text-[#1e1a18]/50`}>Divisional Chart Suite</h2>
            </div>
            <p className={`${body} text-[#1e1a18]/40`}>
              20 divisional charts — D2 through D60 — covering wealth, career,
              soul, children, karma, and past life imprints.
            </p>
          </div>

          {/* Compatibility — coming soon */}
          <div className={`${row} opacity-50 cursor-not-allowed select-none`}>
            <div>
              <p className={`${tag} text-[#9a7c2e]/60 mb-3`}>Coming Soon</p>
              <h2 className={`${h2} text-[#1e1a18]/50`}>Compatibility Reading</h2>
            </div>
            <p className={`${body} text-[#1e1a18]/40`}>
              Full Jyotish synastry, Ashtakuta Moon compatibility, and Human Design
              composite report for two charts.
            </p>
          </div>

        </div>
      </main>
    </div>
  )
}
