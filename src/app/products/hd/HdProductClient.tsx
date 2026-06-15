'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import ChartDisplay from '@/components/chart/ChartDisplay'
import Header from '@/components/layout/Header'
import SelfIntakeForm from '@/components/intake/SelfIntakeForm'
import type { ChartMode } from '@/components/chart/ChartDisplay'

const HD_COLUMNS = [
  'hd_type_strategy_authority', 'hd_profile', 'hd_incarnation_cross', 'hd_definition',
  'hd_center_head', 'hd_center_ajna', 'hd_center_throat', 'hd_center_g',
  'hd_center_heart', 'hd_center_sacral', 'hd_center_solar_plexus',
  'hd_center_spleen', 'hd_center_root',
  'hd_variables', 'hd_shadow_gates', 'hd_circuits', 'hd_timing_events',
]

interface HdProductClientProps {
  chart:     Record<string, unknown>
  tier:      number
  hasIntake: boolean
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      backgroundColor: '#0e0c0b', borderBottom: '1px solid rgba(154,124,46,0.2)',
      padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '14px',
    }}>
      <div style={{ flex: 1, height: '3px', backgroundColor: 'rgba(154,124,46,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: '#9a7c2e', borderRadius: '2px', transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-raleway, sans-serif)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(154,124,46,0.7)', whiteSpace: 'nowrap' }}>
        {done} / {total} sections
      </span>
    </div>
  )
}

export default function HdProductClient({ chart: initialChart, tier, hasIntake: initialHasIntake }: HdProductClientProps) {
  const supabase = createClient()
  const [chart, setChart]           = useState<Record<string, unknown>>(initialChart)
  const [mode, setMode]             = useState<ChartMode>('traditional')
  const [generating, setGenerating] = useState(false)
  const [done, setDone]             = useState(0)
  const [total, setTotal]           = useState(0)
  const [intakeComplete, setIntakeComplete] = useState(initialHasIntake)
  const chartIdRef = useRef<string>(String(initialChart.id ?? ''))

  const refreshChart = useCallback(async () => {
    const { data } = await supabase.from('charts').select('*').eq('id', chartIdRef.current).single()
    if (data) setChart(data as Record<string, unknown>)
  }, [supabase])

  useEffect(() => {
    if (!intakeComplete) return

    const missing = HD_COLUMNS.filter(col => {
      const v = chart[col]
      return !v || typeof v !== 'string' || v.trim() === ''
    })
    if (missing.length === 0) return

    const skipColumns = HD_COLUMNS.filter(c => !missing.includes(c))
    const intakeData  = (chart.intake_self ?? initialChart.intake_self) as Record<string, string> | null

    setGenerating(true)
    setTotal(missing.length)
    setDone(0)

    const body = JSON.stringify({
      chart_json:   chart.chart_json ?? initialChart.chart_json,
      tier,
      chart_id:     chartIdRef.current,
      skip_columns: skipColumns,
      intake_json:  intakeData ?? null,
    })

    let cancelled = false, completedCount = 0

    async function stream() {
      try {
        const res = await fetch('/api/interpret-hd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
        if (!res.ok || !res.body) { setGenerating(false); return }
        const reader = res.body.getReader(), decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done: d, value } = await reader.read()
          if (d || cancelled) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n'); buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const ev = JSON.parse(line.slice(6)) as Record<string, unknown>
              if (ev.done) { await refreshChart(); if (!cancelled) setGenerating(false); return }
              if (ev.status === 'done' || ev.status === 'error') { completedCount++; if (!cancelled) setDone(completedCount); await refreshChart() }
            } catch { /* skip */ }
          }
        }
      } catch (err) { console.error('[HdProductClient]', err) }
      finally { if (!cancelled) setGenerating(false) }
    }

    stream()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intakeComplete])

  if (!intakeComplete) {
    return (
      <SelfIntakeForm
        chartId={String(initialChart.id ?? '')}
        initialAnswers={(initialChart.intake_self as Record<string, string> | undefined) ?? undefined}
        onComplete={async () => {
          await refreshChart()
          setIntakeComplete(true)
        }}
      />
    )
  }

  return (
    <>
      {generating && <ProgressBar done={done} total={total} />}
      <div style={{ paddingTop: generating ? '36px' : '0' }}>
        <Header />
        <ChartDisplay chart={chart} chartJson={chart.chart_json} tier={tier} mode={mode} onModeChange={setMode} />
      </div>
    </>
  )
}
