'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { signIn } from '@/lib/auth'

const schema = z.object({
  email:    z.string().email('Valid email required'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setServerError(null)
    try {
      await signIn(data.email, data.password)
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-[#f4f1e8] border border-[#c4a96a]/40 rounded p-8 shadow-sm">

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

        <h1 className="font-[family-name:var(--font-playfair)] text-2xl text-[#1e1a18] text-center mb-2">
          Welcome Back
        </h1>
        <p className="font-[family-name:var(--font-cormorant)] text-base text-[#1e1a18]/60 text-center mb-8">
          Sign in to your account.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <Input label="Email"    type="email"    {...register('email')}    error={errors.email?.message} />
          <Input label="Password" type="password" {...register('password')} error={errors.password?.message} />

          {serverError && (
            <p className="font-[family-name:var(--font-raleway)] text-sm text-[#6b2737] text-center">
              {serverError}
            </p>
          )}

          <Button type="submit" loading={isSubmitting} size="lg" className="w-full mt-2">
            Sign In
          </Button>
        </form>

        <p className="font-[family-name:var(--font-cormorant)] text-base text-center text-[#1e1a18]/60 mt-6">
          New here?{' '}
          <Link href="/register" className="text-[#9a7c2e] hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
