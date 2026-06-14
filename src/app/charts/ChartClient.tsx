'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ChartDisplay, { ChartMode } from '@/components/chart/ChartDisplay'
import LoadingChart from '@/components/chart/LoadingChart'

// ─── Types ────────────────────────────────────────────────────────────────────

type ChartRecord = { id?: string; chart_json?: unknown; [key: string]: unknown }

type Stage = 'form' | 'calculating' | 'display'

interface FormFields {
  birth_date:    string
  birth_time:    string
  birth_city:    string
  birth_state:   string
  birth_country: string
}

interface ChartClientProps {
  profile: Record<string, unknown> | null
  chart:   ChartRecord | null
  tier:    number
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

// ─── Birth Data Form ──────────────────────────────────────────────────────────

function BirthDataForm({
  fields,
  onChange,
  onSubmit,
  error,
  loading,
}: {
  fields:    FormFields
  onChange:  (patch: Partial<FormFields>) => void
  onSubmit:  (e: React.FormEvent) => void
  error:     string | null
  loading:   boolean
}) {
  const label: React.CSSProperties = {
    display:       'block',
    fontFamily:    'var(--font-raleway, sans-serif)',
    fontSize:      '10px',
    fontWeight:    600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color:         'rgba(154,124,46,0.7)',
    marginBottom:  '6px',
  }

  const input: React.CSSProperties = {
    width:           '100%',
    backgroundColor: '#1a1410',
    border:          '1px solid rgba(154,124,46,0.3)',
    borderRadius:    '3px',
    padding:         '10px 12px',
    color:           '#f4f1e8',
    fontFamily:      'Georgia, serif',
    fontSize:        '14px',
    outline:         'none',
    colorScheme:     'dark',
  }

  const field = (name: keyof FormFields, labelText: string, type = 'text') => (
    <div>
      <label style={label}>{labelText}</label>
      <input
        type={type}
        value={fields[name]}
        onChange={e => onChange({ [name]: e.target.value })}
        style={input}
        required={name !== 'birth_state'}
      />
    </div>
  )

  return (
    <div
      style={{
        minHeight:       '100vh',
        backgroundColor: '#0e0c0b',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        padding:         '40px 20px',
      }}
    >
      <div
        style={{
          width:        '100%',
          maxWidth:     '480px',
          border:       '1px solid rgba(154,124,46,0.3)',
          borderRadius: '4px',
          padding:      '40px',
        }}
      >
        <p
          style={{
            fontFamily:    'var(--font-raleway, sans-serif)',
            fontSize:      '10px',
            fontWeight:    700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color:         '#9a7c2e',
            marginBottom:  '8px',
          }}
        >
          MotorSui
        </p>
        <h1
          style={{
            fontFamily:   'Georgia, serif',
            fontSize:     '24px',
            color:        '#f4f1e8',
            marginBottom: '32px',
          }}
        >
          Generate Your Chart
        </h1>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {field('birth_date', 'Birth Date', 'date')}
            {field('birth_time', 'Birth Time', 'time')}
          </div>

          {field('birth_city', 'Birth City')}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {field('birth_state', 'Birth State / Province')}
            {field('birth_country', 'Birth Country')}
          </div>

          {error && (
            <p
              style={{
                fontFamily: 'Georgia, serif',
                fontSize:   '13px',
                color:      '#c45a5a',
                fontStyle:  'italic',
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: loading ? 'rgba(154,124,46,0.3)' : '#9a7c2e',
              color:           '#0e0c0b',
              border:          'none',
              borderRadius:    '3px',
              padding:         '13px 24px',
              fontFamily:      'var(--font-raleway, sans-serif)',
              fontSize:        '11px',
              fontWeight:      700,
              letterSpacing:   '0.14em',
              textTransform:   'uppercase',
              cursor:          loading ? 'not-allowed' : 'pointer',
              marginTop:       '8px',
            }}
          >
            {loading ? 'Calculating...' : 'Calculate Chart'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
//
// Responsibility: collect birth data, calculate chart, store it, hand off to
// product selection. Interpretation is NOT triggered here — it fires on first
// visit to a purchased product page.

export default function ChartClient({ profile, chart: initialChart, tier }: ChartClientProps) {
  const router   = useRouter()
  const supabase = createClient()

  const [stage, setStage] = useState<Stage>(() =>
    initialChart ? 'display' : 'form'
  )

  const [chart, setChart] = useState<ChartRecord | null>(initialChart)
  const [mode, setMode]   = useState<ChartMode>('traditional')

  const [form, setForm] = useState<FormFields>({
    birth_date:    str(profile?.birth_date),
    birth_time:    str(profile?.birth_time),
    birth_city:    str(profile?.birth_city),
    birth_state:   str(profile?.birth_state),
    birth_country: str(profile?.birth_country),
  })
  const [formError, setFormError] = useState<string | null>(null)

  // ── Form submit → calculate chart → redirect to product selection ──

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!form.birth_date || !form.birth_time || !form.birth_city || !form.birth_country) {
      setFormError('Birth date, time, city, and country are required.')
      return
    }

    setStage('calculating')

    try {
      const res = await fetch('/api/chart', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })

      const data = await res.json() as { chart_json?: unknown; chart_id?: string; error?: string }

      if (!res.ok || !data.chart_json || !data.chart_id) {
        setFormError(data.error ?? 'Chart calculation failed. Please try again.')
        setStage('form')
        return
      }

      // Fetch the newly created chart row so the display stage has full data
      const { data: row } = await supabase
        .from('charts')
        .select('*')
        .eq('id', data.chart_id)
        .single()

      if (row) setChart(row as ChartRecord)

      // Redirect to product selection — interpretation fires on first product visit
      router.push('/products')

    } catch (err) {
      console.error('[ChartClient] calc error:', err)
      setFormError('Chart calculation failed. Please try again.')
      setStage('form')
    }
  }

  // ── Render ──

  if (stage === 'calculating') {
    return <LoadingChart message="Calculating your chart..." />
  }

  if (stage === 'form') {
    return (
      <BirthDataForm
        fields={form}
        onChange={patch => setForm(prev => ({ ...prev, ...patch }))}
        onSubmit={handleFormSubmit}
        error={formError}
        loading={false}
      />
    )
  }

  // display — returning users who navigate to /charts directly
  return (
    <ChartDisplay
      chart={chart as Record<string, unknown> | null}
      chartJson={chart?.chart_json}
      tier={tier}
      mode={mode}
      onModeChange={setMode}
    />
  )
}
