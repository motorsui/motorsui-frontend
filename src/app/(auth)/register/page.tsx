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
import { signUp } from '@/lib/auth'

const schema = z.object({
  first_name:      z.string().min(1, 'First name is required'),
  last_name:       z.string().min(1, 'Last name is required'),
  email:           z.string().email('Valid email required'),
  password:        z.string().min(8, 'Password must be at least 8 characters'),
  cell:            z.string().optional(),
  birth_city:      z.string().optional(),
  birth_state:     z.string().optional(),
  birth_country:   z.string().optional(),
  birth_date:      z.string().optional(),
  birth_time:      z.string().optional(),
  current_city:    z.string().optional(),
  current_state:   z.string().optional(),
  current_country: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setServerError(null)
    try {
      const { email, password, ...profileData } = data
      await signUp(email, password, profileData)
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    }
  }

  const sectionLabel = 'font-[family-name:var(--font-raleway)] text-xs font-semibold text-[#9a7c2e] uppercase tracking-widest mb-4'

  return (
    <div className="w-full max-w-xl">
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
          Create Your Account
        </h1>
        <p className="font-[family-name:var(--font-cormorant)] text-base text-[#1e1a18]/60 text-center mb-8">
          Your chart is waiting.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" {...register('first_name')} error={errors.first_name?.message} />
            <Input label="Last name"  {...register('last_name')}  error={errors.last_name?.message} />
          </div>
          <Input label="Email"    type="email"    {...register('email')}    error={errors.email?.message} />
          <Input label="Password" type="password" {...register('password')} error={errors.password?.message} />
          <Input label="Cell phone" type="tel"   {...register('cell')}     error={errors.cell?.message} />

          <div className="border-t border-[#c4a96a]/30 pt-5">
            <p className={sectionLabel}>Birth Information</p>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-4">
                <Input label="Birth city"    {...register('birth_city')}    error={errors.birth_city?.message} />
                <Input label="Birth state"   {...register('birth_state')}   error={errors.birth_state?.message} />
                <Input label="Birth country" {...register('birth_country')} error={errors.birth_country?.message} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Birth date" type="date" {...register('birth_date')} error={errors.birth_date?.message} />
                <Input label="Birth time" type="time" {...register('birth_time')} error={errors.birth_time?.message} />
              </div>
            </div>
          </div>

          <div className="border-t border-[#c4a96a]/30 pt-5">
            <p className={sectionLabel}>Current Location</p>
            <div className="grid grid-cols-3 gap-4">
              <Input label="City"    {...register('current_city')}    error={errors.current_city?.message} />
              <Input label="State"   {...register('current_state')}   error={errors.current_state?.message} />
              <Input label="Country" {...register('current_country')} error={errors.current_country?.message} />
            </div>
          </div>

          {serverError && (
            <p className="font-[family-name:var(--font-raleway)] text-sm text-[#6b2737] text-center">
              {serverError}
            </p>
          )}

          <Button type="submit" loading={isSubmitting} size="lg" className="w-full mt-2">
            Create Account
          </Button>
        </form>

        <p className="font-[family-name:var(--font-cormorant)] text-base text-center text-[#1e1a18]/60 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-[#9a7c2e] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
