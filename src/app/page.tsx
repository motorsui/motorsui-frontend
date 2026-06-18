import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f4f1e8] flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">

        <Image
          src="https://assets.cdn.filesafe.space/YYc9Wjz5jWmWNvqrL19t/media/6a244cd549e55f851989f74d.png"
          alt="MotorSui"
          width={200}
          height={60}
          className="h-16 w-auto mb-10"
          priority
        />

        <p className="font-[family-name:var(--font-cormorant)] text-2xl text-[#1e1a18]/60 tracking-wide mb-5">
          The One Who Moves Self
        </p>

        <p className="font-[family-name:var(--font-cormorant)] text-xl text-[#1e1a18] max-w-lg leading-relaxed mb-14">
          The world&apos;s first sidereal Human Design and Jyotish platform.
          Know your chart. Live your design.
        </p>

        <div className="flex items-center gap-4">
          <Link href="/register">
            <Button variant="primary" size="lg">Get My Chart</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg">Sign In</Button>
          </Link>
        </div>

      </main>
    </div>
  )
}
