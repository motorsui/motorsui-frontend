import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { session_id } = await searchParams

  if (!session_id) redirect('/products')

  return (
    <div className="min-h-screen bg-[#f4f1e8]">
      <Header />
      <main className="max-w-xl mx-auto px-6 py-24 text-center">

        <p className="font-[family-name:var(--font-raleway)] text-[10px] font-semibold tracking-[0.16em] uppercase text-[#9a7c2e] mb-4">
          MotorSui
        </p>

        <h1 className="font-[family-name:var(--font-playfair)] text-4xl text-[#1e1a18] mb-4">
          Purchase Complete
        </h1>

        <p className="font-[family-name:var(--font-cormorant)] text-lg text-[#1e1a18]/60 mb-10 leading-relaxed">
          Your reading is now unlocked. Return to your products to access it.
          If your access does not appear immediately, refresh the page in a moment.
        </p>

        <Link
          href="/products"
          className="inline-block font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.14em] uppercase bg-[#9a7c2e] text-[#f4f1e8] px-6 py-3 rounded hover:bg-[#b8962e] transition-colors"
        >
          View My Products
        </Link>

      </main>
    </div>
  )
}
