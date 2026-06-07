'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import ChartDisplay from '@/components/chart/ChartDisplay'
import LoadingChart from '@/components/chart/LoadingChart'

const schema = z.object({
  birth_date:    z.string().min(1, 'Birth date is required'),
  birth_time:    z.string().min(1, 'Birth time is required'),
  birth_city:    z.string().min(1, 'Birth city is required'),
  birth_state:   z.string().optional(),
  birth_country: z.string().min(1, 'Birth country is required'),
})

type FormData = z.infer<typeof schema>

interface Profile {
  birth_date?: string | null
  birth_time?: string | null
  birth_city?: string | null
  birth_state?: string | null
  birth_country?: string | null
  first_name?: string | null
}

interface Chart {
  id: string
  chart_json: Record<string, unknown>
  interpretation_t1?: string | null
  interpretation_t2?: string | null
  interpretation_t3?: string | null
}

interface ChartClientProps {
  profile: Profile | null
  chart: Chart | null
  tier: number
}

type Step = 'idle' | 'calculating' | 'interpreting' | 'done'

const loadingMessages: Record<Step, string> = {
  idle:         '',
  calculating:  'Calculating your sidereal chart...',
  interpreting: 'Generating your interpretation...',
  done:         '',
}

export default function ChartClient({ profile, chart, tier }: ChartClientProps) {
  const tierKey = `interpretation_t${tier}` as keyof Chart
  const existingInterpretation = chart?.[tierKey] as string | null | undefined

  const [step, setStep] = useState<Step>('idle')
  const [interpretation, setInterpretation] = useState<string | null>(
    existingInterpretation ?? null
  )
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      birth_date:    profile?.birth_date    ?? '',
      birth_time:    profile?.birth_time    ?? '',
      birth_city:    profile?.birth_city    ?? '',
      birth_state:   profile?.birth_state   ?? '',
      birth_country: profile?.birth_country ?? '',
    },
  })

  async function onSubmit(data: FormData) {
    setError(null)

    // Step 1: calculate chart
    setStep('calculating')
    const chartRes = await fetch('/api/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!chartRes.ok) {
      const err = await chartRes.json().catch(() => ({}))
      setError(err.error ?? 'Chart calculation failed. Please check your birth details.')
      setStep('idle')
      return
    }

    const { chart_json, chart_id } = await chartRes.json()

    // Step 2: generate interpretation
    setStep('interpreting')
    const interpretRes = await fetch('/api/interpret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chart_json, tier, chart_id }),
    })

    if (!interpretRes.ok) {
      const err = await interpretRes.json().catch(() => ({}))
      setError(err.error ?? 'Interpretation failed. Please try again.')
      setStep('idle')
      return
    }

    const { interpretation: text } = await interpretRes.json()
    setInterpretation(text)
    setStep('done')
  }

  // Loading states
  if (step === 'calculating' || step === 'interpreting') {
    return <LoadingChart message={loadingMessages[step]} />
  }

  // Show interpretation if available
  if (interpretation) {
    return (
      <main>
        <ChartDisplay interpretation={interpretation} tier={tier} />
      </main>
    )
  }

  // Form — no chart yet
  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-[family-name:var(--font-playfair)] text-4xl text-[#1e1a18] mb-3">
        Generate Your Chart
      </h1>
      <p className="font-[family-name:var(--font-cormorant)] text-lg text-[#1e1a18]/60 mb-10">
        Enter your birth details. All calculations are sidereal Lahiri.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="border border-[#c4a96a]/40 rounded p-6 flex flex-col gap-5">
          <p className="font-[family-name:var(--font-raleway)] text-xs font-semibold text-[#9a7c2e] uppercase tracking-widest">
            Birth Information
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Birth date"
              type="date"
              {...register('birth_date')}
              error={errors.birth_date?.message}
            />
            <Input
              label="Birth time"
              type="time"
              {...register('birth_time')}
              error={errors.birth_time?.message}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Birth city"
              {...register('birth_city')}
              error={errors.birth_city?.message}
            />
            <Input
              label="Birth state"
              {...register('birth_state')}
              error={errors.birth_state?.message}
            />
            <Input
              label="Birth country"
              {...register('birth_country')}
              error={errors.birth_country?.message}
            />
          </div>
        </div>

        {error && (
          <p className="font-[family-name:var(--font-raleway)] text-sm text-[#6b2737] text-center">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          Generate My Chart
        </Button>
      </form>
    </main>
  )
}
