'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import ChartDisplay from '@/components/chart/ChartDisplay'
import Header from '@/components/layout/Header'
import IntakeForm from '@/components/intake/IntakeForm'
import type { ChartMode } from '@/components/chart/ChartDisplay'

// Natal-only columns. D-chart columns are a separate product — always skip them here.
const NATAL_COLUMNS = [
  'interp_lagna',
  'interp_sun', 'interp_moon', 'interp_mercury', 'interp_venus',
  'interp_mars', 'interp_jupiter', 'interp_saturn',
  'interp_uranus', 'interp_neptune', 'interp_pluto',
  'interp_rahu', 'interp_ketu',
  'interp_dignities', 'interp_mahadasha', 'interp_purusharthas',
]

const DCHART_COLUMNS = [
  'interp_d2', 'interp_d3', 'interp_d4', 'interp_d5', 'interp_d6',
  'interp_d7', 'interp_d8', 'interp_d9', 'interp_d10', 'interp_d11',
  'interp_d12', 'interp_d16', 'interp_d20', 'interp_d24', 'interp_d27',
  'interp_d30', 'interp_d40', 'interp_d45', 'interp_d60',
]

interface NatalProductClientProps {
  chart:      Record<string, unknown>
  tier:       number
  hasIntake:  boolean
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div
      style={{
        position:        'fixed',
        top:             0,
        left:            0,
        right:           0,
        zIndex:          50,
        backgroundColor: '#0e0c0b',
        borderBottom:    '1px solid rgba(154,124,46,0.2)',
        padding:         '10px 20px',
        display:         'flex',
        alignItems:      'center',
        gap:             '14px',
      }}
    >
      <div
        style={{
          flex:            1,
          height:          '3px',
          backgroundColor: 'rgba(154,124,46,0.15)',
          borderRadius:    '2px',
          overflow:        'hidden',
        }}
      >
        <div
          style={{
            height:          '100%',
            width:           `${pct}%`,
            backgroundColor: '#9a7c2e',
            borderRadius:    '2px',
            transition:      'width 0.4s ease',
          }}
        />
      </div>
      <span
        style={{
          fontFamily:    'var(--font-raleway, sans-serif)',
          fontSize:      '10px',
          fontWeight:    600,
          letterSpacing: '0.1em',
          color:         'rgba(154,124,46,0.7)',
          whiteSpace:    'nowrap',
        }}
      >
        {done} / {total} sections
      </span>
    </div>
  )
}

export default function NatalProductClient({ chart: initialChart, tier, hasIntake: initialHasIntake }: NatalProductClientProps) {
  const supabase = createClient()

  const [chart, setChart]           = useState<Record<string, unknown>>(initialChart)
  const [mode,  setMode]            = useState<ChartMode>('traditional')
  const [generating, setGenerating] = useState(false)
  const [done,  setDone]            = useState(0)
  const [total, setTotal]           = useState(0)
  const [intakeComplete, setIntakeComplete] = useState(initialHasIntake)

  const eventSourceRef = useRef<EventSource | null>(null)
  const chartIdRef     = useRef<string>(String(initialChart.id ?? ''))

  const refreshChart = useCallback(async () => {
    const { data } = await supabase
      .from('charts')
      .select('*')
      .eq('id', chartIdRef.current)
      .single()
    if (data) setChart(data as Record<string, unknown>)
  }, [supabase])

  // Kick off interpretation after intake is confirmed present
  useEffect(() => {
    if (!intakeComplete) return

    const chartJson = chart.chart_json ?? initialChart.chart_json

    const missing = NATAL_COLUMNS.filter(col => {
      const v = chart[col]
      return !v || typeof v !== 'string' || v.trim() === ''
    })

    if (missing.length === 0) return

    // Skip natal columns already filled + all D-chart columns (separate product)
    const skipColumns = [
      ...NATAL_COLUMNS.filter(c => !missing.includes(c)),
      ...DCHART_COLUMNS,
    ]
    const intakeData  = (chart.intake_self ?? initialChart.intake_self) as Record<string, string> | null

    setGenerating(true)
    setTotal(missing.length)
    setDone(0)

    const body = JSON.stringify({
      chart_json:   chartJson,
      tier,
      chart_id:     chartIdRef.current,
      skip_columns: skipColumns,
      intake_json:  intakeData ?? null,
    })

    let cancelled      = false
    let completedCount = 0

    async function streamInterpret() {
      try {
        const res = await fetch('/api/interpret', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        })

        if (!res.ok || !res.body) { setGenerating(false); return }

        const reader  = res.body.getReader()
        const decoder = new TextDecoder()
        let   buffer  = ''

        while (true) {
          const { done: streamDone, value } = await reader.read()
          if (streamDone || cancelled) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const event = JSON.parse(line.slice(6)) as Record<string, unknown>
              if (event.done) {
                await refreshChart()
                if (!cancelled) setGenerating(false)
                return
              }
              if (event.status === 'done' || event.status === 'error') {
                completedCount++
                if (!cancelled) setDone(completedCount)
                await refreshChart()
              }
            } catch { /* malformed SSE line */ }
          }
        }
      } catch (err) {
        console.error('[NatalProductClient] SSE error:', err)
      } finally {
        if (!cancelled) setGenerating(false)
      }
    }

    streamInterpret()

    return () => {
      cancelled = true
      eventSourceRef.current?.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intakeComplete])

  // ── Intake gate ────────────────────────────────────────────────────────────
  if (!intakeComplete) {
    return (
      <IntakeForm
        formType="self"
        chartId={String(initialChart.id ?? '')}
        onComplete={async (answers) => {
          const res = await fetch('/api/save-intake', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ formType: 'self', chartId: String(initialChart.id), answers }),
          })
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error((err as Record<string, string>).error ?? 'Failed to save intake')
          }
          // Merge intake into local chart state so useEffect can read it
          setChart(prev => ({ ...prev, intake_self: answers }))
          setIntakeComplete(true)
        }}
      />
    )
  }

  // ── Report ─────────────────────────────────────────────────────────────────
  return (
    <>
      {generating && <ProgressBar done={done} total={total} />}
      <div style={{ paddingTop: generating ? '36px' : '0' }}>
        <Header />
        <ChartDisplay
          chart={chart}
          chartJson={chart.chart_json}
          tier={tier}
          mode={mode}
          onModeChange={setMode}
        />
      </div>
    </>
  )
}
