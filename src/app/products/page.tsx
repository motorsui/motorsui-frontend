import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import CheckoutButton from '@/components/ui/CheckoutButton'

interface Product {
  key:         string
  name:        string
  description: string
  free:        boolean
  href:        string
  priceId:     string
}

const PRODUCTS: Product[] = [
  {
    key:         'natal_report',
    name:        'Natal Astrology Report',
    description: 'Sidereal Lahiri natal chart with full planetary placements, nakshatras, dignities, Vimshottari Dasha timeline, and Purusharthas.',
    free:        true,
    href:        '/products/natal',
    priceId:     '',
  },
  {
    key:         'hd_report',
    name:        'Human Design Report',
    description: 'Full sidereal Human Design report: Type, Strategy, Authority, Profile, Incarnation Cross, Centers, Channels, and Variables.',
    free:        false,
    href:        '/products/hd',
    priceId:     process.env.STRIPE_PRICE_HD ?? '',
  },
  {
    key:         'divcharts_report',
    name:        'Divisional Charts Report',
    description: '20 divisional charts — D2 through D60 — covering wealth, career, soul, children, karma, and past life imprints.',
    free:        false,
    href:        '/products/dcharts',
    priceId:     process.env.STRIPE_PRICE_DCHARTS ?? '',
  },
  {
    key:         'combined_report',
    name:        'Combined Astrology + Human Design Report',
    description: 'Integrated sidereal astrology and Human Design synthesis. Natal chart signatures cross-referenced with HD type, centers, channels, and Gene Keys.',
    free:        false,
    href:        '/products/combined',
    priceId:     process.env.STRIPE_PRICE_COMBINED ?? '',
  },
  {
    key:         'synastry_report',
    name:        'Synastry Report',
    description: 'Full Jyotish synastry for two charts: Ashtakuta Moon compatibility, cross-chart aspects, karmic axis overlay, and timing alignment.',
    free:        false,
    href:        '/products/synastry',
    priceId:     process.env.STRIPE_PRICE_SYNASTRY ?? '',
  },
  {
    key:         'hd_composite_report',
    name:        'Human Design Composite Report',
    description: 'Full HD composite for two charts: electromagnetic connections, circuit field map, profile dynamics, center dominance, and conditioning triggers.',
    free:        false,
    href:        '/products/hd-composite',
    priceId:     process.env.STRIPE_PRICE_HD_COMPOSITE ?? '',
  },
  {
    key:         'parenting_astro_report',
    name:        'Parenting Astrology Report',
    description: 'Jyotish parenting analysis: parent-child synastry, 5th house signatures, Putrakaraka placement, and generational karmic patterns.',
    free:        false,
    href:        '/products/parenting-astro',
    priceId:     process.env.STRIPE_PRICE_PARENTING_ASTRO ?? '',
  },
  {
    key:         'parenting_hd_report',
    name:        'Parenting Human Design Report',
    description: 'HD parenting analysis: type interaction, authority dynamics, conditioning fields, and circuit compatibility between parent and child.',
    free:        false,
    href:        '/products/parenting-hd',
    priceId:     process.env.STRIPE_PRICE_PARENTING_HD ?? '',
  },
]

export default async function ProductsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: chart }, { data: profile }] = await Promise.all([
    supabase.from('charts').select('id').eq('user_id', user.id).maybeSingle(),
    supabase.from('profiles').select('purchased_products').eq('id', user.id).maybeSingle(),
  ])

  if (!chart) redirect('/charts')

  const purchased = (profile?.purchased_products as string[] | null) ?? []

  const row  = 'border border-[#c4a96a]/30 rounded p-8 flex flex-col gap-4'
  const tag  = 'font-[family-name:var(--font-raleway)] text-[10px] font-semibold tracking-[0.14em] uppercase'
  const h2   = 'font-[family-name:var(--font-playfair)] text-2xl text-[#1e1a18]'
  const body = 'font-[family-name:var(--font-cormorant)] text-base text-[#1e1a18]/70 leading-relaxed'
  const btn  = 'self-start mt-2 inline-block font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.14em] uppercase bg-[#9a7c2e] text-[#f4f1e8] px-5 py-2.5 rounded hover:bg-[#b8962e] transition-colors'

  return (
    <div className="min-h-screen bg-[#f4f1e8]">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-16">

        <div className="mb-12">
          <p className={`${tag} text-[#9a7c2e] mb-2`}>MotorSui</p>
          <h1 className="font-[family-name:var(--font-playfair)] text-4xl text-[#1e1a18] mb-3">
            Your Reports
          </h1>
          <p className={body}>
            Each report is a standalone purchase. Buy any in any order.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {PRODUCTS.map((product) => {
            const owned = product.free || purchased.includes(product.key)

            return (
              <div key={product.key} className={row}>
                <div>
                  <p className={`${tag} ${owned ? 'text-[#9a7c2e]' : 'text-[#9a7c2e]/70'} mb-3`}>
                    {product.free ? 'Free · Included' : owned ? 'Purchased' : 'Paid · Unlock'}
                  </p>
                  <h2 className={h2}>{product.name}</h2>
                </div>
                <p className={body}>{product.description}</p>
                {owned ? (
                  <Link href={product.href} className={btn}>
                    View Report
                  </Link>
                ) : (
                  <CheckoutButton
                    priceId={product.priceId}
                    label="Unlock Report"
                    disabled={!product.priceId}
                  />
                )}
              </div>
            )
          })}
        </div>

      </main>
    </div>
  )
}
