import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import CheckoutButton from '@/components/ui/CheckoutButton'

const PRICE_HD      = process.env.STRIPE_PRICE_HD      ?? ''
const PRICE_DCHARTS = process.env.STRIPE_PRICE_DCHARTS ?? ''
const PRICE_COMPAT  = process.env.STRIPE_PRICE_COMPAT  ?? ''

export default async function ProductsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: chart }, { data: profile }] = await Promise.all([
    supabase.from('charts').select('id').eq('user_id', user.id).maybeSingle(),
    supabase.from('profiles').select('tier').eq('id', user.id).maybeSingle(),
  ])

  if (!chart) redirect('/charts')

  const tier = (profile as { tier?: number } | null)?.tier ?? 1

  const row  = 'border border-[#c4a96a]/30 rounded p-8 flex flex-col gap-4'
  const tag  = 'font-[family-name:var(--font-raleway)] text-[10px] font-semibold tracking-[0.14em] uppercase'
  const h2   = 'font-[family-name:var(--font-playfair)] text-2xl text-[#1e1a18]'
  const body = 'font-[family-name:var(--font-cormorant)] text-base text-[#1e1a18]/70 leading-relaxed'
  const accessBtn = 'self-start mt-2 inline-block font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.14em] uppercase bg-[#9a7c2e] text-[#f4f1e8] px-5 py-2.5 rounded hover:bg-[#b8962e] transition-colors'

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

          {/* Natal Chart Reading — free for all */}
          <div className={row}>
            <div>
              <p className={`${tag} text-[#9a7c2e] mb-3`}>Free · Included</p>
              <h2 className={h2}>Natal Chart Reading</h2>
            </div>
            <p className={body}>
              Sidereal Lahiri natal chart with full planetary placements,
              nakshatras, dignities, Vimshottari Dasha timeline, and Purusharthas.
            </p>
            <Link href="/products/natal" className={accessBtn}>
              View Reading
            </Link>
          </div>

          {/* Human Design Reading */}
          {tier >= 2 ? (
            <div className={row}>
              <div>
                <p className={`${tag} text-[#9a7c2e] mb-3`}>Purchased</p>
                <h2 className={h2}>Human Design Reading</h2>
              </div>
              <p className={body}>
                Full sidereal Human Design report: Type, Strategy, Authority,
                Profile, Incarnation Cross, Centers, Channels, and Variables.
              </p>
              <Link href="/products/hd" className={accessBtn}>
                View Reading
              </Link>
            </div>
          ) : (
            <div className={row}>
              <div>
                <p className={`${tag} text-[#9a7c2e] mb-3`}>Paid · Unlock</p>
                <h2 className={h2}>Human Design Reading</h2>
              </div>
              <p className={body}>
                Full sidereal Human Design report: Type, Strategy, Authority,
                Profile, Incarnation Cross, Centers, Channels, and Variables.
              </p>
              <CheckoutButton priceId={PRICE_HD} label="Unlock Reading" disabled={!PRICE_HD} />
            </div>
          )}

          {/* Divisional Chart Suite */}
          {tier >= 3 ? (
            <div className={row}>
              <div>
                <p className={`${tag} text-[#9a7c2e] mb-3`}>Purchased</p>
                <h2 className={h2}>Divisional Chart Suite</h2>
              </div>
              <p className={body}>
                20 divisional charts — D2 through D60 — covering wealth, career,
                soul, children, karma, and past life imprints.
              </p>
              <Link href="/products/dcharts" className={accessBtn}>
                View Charts
              </Link>
            </div>
          ) : (
            <div className={row}>
              <div>
                <p className={`${tag} text-[#9a7c2e] mb-3`}>Paid · Unlock</p>
                <h2 className={h2}>Divisional Chart Suite</h2>
              </div>
              <p className={body}>
                20 divisional charts — D2 through D60 — covering wealth, career,
                soul, children, karma, and past life imprints.
              </p>
              <CheckoutButton priceId={PRICE_DCHARTS} label="Unlock Charts" disabled={!PRICE_DCHARTS} />
            </div>
          )}

          {/* Compatibility Reading */}
          {tier >= 4 ? (
            <div className={row}>
              <div>
                <p className={`${tag} text-[#9a7c2e] mb-3`}>Purchased</p>
                <h2 className={h2}>Compatibility Reading</h2>
              </div>
              <p className={body}>
                Full Jyotish synastry, Ashtakuta Moon compatibility, and Human Design
                composite report for two charts.
              </p>
              <Link href="/products/compat" className={accessBtn}>
                View Reading
              </Link>
            </div>
          ) : (
            <div className={row}>
              <div>
                <p className={`${tag} text-[#9a7c2e] mb-3`}>Paid · Unlock</p>
                <h2 className={h2}>Compatibility Reading</h2>
              </div>
              <p className={body}>
                Full Jyotish synastry, Ashtakuta Moon compatibility, and Human Design
                composite report for two charts.
              </p>
              <CheckoutButton priceId={PRICE_COMPAT} label="Unlock Reading" disabled={!PRICE_COMPAT} />
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
