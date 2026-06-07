import Image from 'next/image'
import Link from 'next/link'

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen bg-[#f4f1e8] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-[#f4f1e8] border border-[#c4a96a]/40 rounded p-8 shadow-sm text-center">

          <div className="flex justify-center mb-8">
            <Image
              src="https://assets.cdn.filesafe.space/YYc9Wjz5jWmWNvqrL19t/media/6a244cd549e55f851989f74d.png"
              alt="MotorSui"
              width={160}
              height={48}
              className="h-12 w-auto"
              priority
            />
          </div>

          <h1 className="font-[family-name:var(--font-playfair)] text-2xl text-[#1e1a18] mb-4">
            Check your email
          </h1>

          <p className="font-[family-name:var(--font-cormorant)] text-lg text-[#1e1a18]/70 leading-relaxed mb-8">
            We sent a confirmation link to your email address. Click it to activate your account.
          </p>

          <div className="border border-[#c4a96a]/30 rounded p-4 mb-8 text-left">
            <p className="font-[family-name:var(--font-raleway)] text-xs font-semibold text-[#9a7c2e] uppercase tracking-widest mb-2">
              Local Development
            </p>
            <p className="font-[family-name:var(--font-cormorant)] text-sm text-[#1e1a18]/60 leading-relaxed">
              The confirmation link redirects to motorsui.com. After confirming your email, return to{' '}
              <a href="http://localhost:3000/login" className="text-[#9a7c2e] hover:underline">
                localhost:3000/login
              </a>{' '}
              to sign in.
            </p>
          </div>

          <Link
            href="/login"
            className="font-[family-name:var(--font-cormorant)] text-base text-[#9a7c2e] hover:underline"
          >
            Back to login
          </Link>

        </div>
      </div>
    </div>
  )
}
