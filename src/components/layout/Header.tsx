'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { signOut } from '@/lib/auth'

export default function Header() {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  const navLink = 'font-[family-name:var(--font-raleway)] text-sm font-semibold text-[#1e1a18] hover:text-[#9a7c2e] transition-colors'

  return (
    <header className="bg-[#f4f1e8] border-b border-[#c4a96a]/40 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/">
          <Image
            src="https://assets.cdn.filesafe.space/YYc9Wjz5jWmWNvqrL19t/media/6a244cd549e55f851989f74d.png"
            alt="MotorSui"
            width={140}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </Link>

        <nav className="flex items-center gap-6">
          <Link href="/" className={navLink}>Home</Link>
          <Link href="/charts" className={navLink}>Charts</Link>

          {user ? (
            <>
              <Link href="/dashboard" className={navLink}>Dashboard</Link>
              <button
                onClick={handleSignOut}
                className="font-[family-name:var(--font-raleway)] text-sm font-semibold text-[#9a7c2e] hover:text-[#6b2737] transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={navLink}>Login</Link>
              <Link
                href="/register"
                className="font-[family-name:var(--font-raleway)] text-sm font-semibold bg-[#9a7c2e] text-[#f4f1e8] px-4 py-1.5 rounded hover:bg-[#b8962e] transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
