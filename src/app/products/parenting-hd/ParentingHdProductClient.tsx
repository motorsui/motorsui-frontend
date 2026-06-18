'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import ParentingIntakeForm from '@/components/intake/ParentingIntakeForm'

const PARENTING_HD_COLUMNS = [
  'parenting_hd_type_strategy', 'parenting_hd_authority', 'parenting_hd_profile',
  'parenting_hd_definition', 'parenting_hd_signature', 'parenting_hd_not_self',
  'parenting_hd_incarnation_cross',
  'parenting_hd_center_head', 'parenting_hd_center_ajna', 'parenting_hd_center_throat',
  'parenting_hd_center_g', 'parenting_hd_center_heart', 'parenting_hd_center_sacral',
  'parenting_hd_center_solar_plexus', 'parenting_hd_center_spleen', 'parenting_hd_center_root',
  'parenting_hd_personality_gates', 'parenting_hd_design_gates',
  'parenting_hd_fear_gates', 'parenting_hd_melancholy_gates', 'parenting_hd_penta_qualities',
  'parenting_hd_variable_brain', 'parenting_hd_variable_setting',
  'parenting_hd_variable_storyline', 'parenting_hd_variable_mind',
]

interface ParentingHdProductClientProps {
  chart:         Record<string, unknown>
  childChart:    Record<string, unknown> | null
  tier:          number
  hasIntake:     boolean
  hasChildChart: boolean
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, backgroundColor: '#0e0c0b', borderBottom: '1px solid rgba(154,124,46,0.2)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{ flex: 1, height: '3px', backgroundColor: 'rgba(154,124,46,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: '#9a7c2e', borderRadius: '2px', transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-raleway, sans-serif)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(154,124,46,0.7)', whiteSpace: 'nowrap' }}>
        {done} / {total} sections
      </span>
    </div>
  )
}

function ParentingHdSection({ label, content }: { label: string; content: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid rgba(154,124,46,0.12)' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', textAlign: 'left', padding: '18px 24px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-raleway, sans-serif)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: '#f4f1e8', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ color: '#9a7c2e', fontSize: '16px' }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 24px 24px', fontFamily: 'var(--font-cormorant, serif)', fontSize: '16px', lineHeight: '1.8', color: 'rgba(244,241,232,0.85)' }}>
          {content
            ? <div className="interp-prose" dangerouslySetInnerHTML={{ __html: content }} />
            : <span style={{ color: 'rgba(154,124,46,0.4)', fontStyle: 'italic' }}>Generating…</span>
          }
        </div>
      )}
    </div>
  )
}

function ParentingHdReport({ childChart }: { childChart: Record<string, unknown> | null }) {
  const sections = [
    { key: 'parenting_hd_type_strategy',        label: 'Type & Strategy' },
    { key: 'parenting_hd_authority',             label: 'Authority' },
    { key: 'parenting_hd_profile',               label: 'Profile' },
    { key: 'parenting_hd_definition',            label: 'Definition' },
    { key: 'parenting_hd_signature',             label: 'Signature' },
    { key: 'parenting_hd_not_self',              label: 'Not-Self Theme' },
    { key: 'parenting_hd_incarnation_cross',     label: 'Incarnation Cross' },
    { key: 'parenting_hd_center_head',           label: 'Head Center' },
    { key: 'parenting_hd_center_ajna',           label: 'Ajna Center' },
    { key: 'parenting_hd_center_throat',         label: 'Throat Center' },
    { key: 'parenting_hd_center_g',              label: 'G Center' },
    { key: 'parenting_hd_center_heart',          label: 'Heart Center' },
    { key: 'parenting_hd_center_sacral',         label: 'Sacral Center' },
    { key: 'parenting_hd_center_solar_plexus',   label: 'Solar Plexus Center' },
    { key: 'parenting_hd_center_spleen',         label: 'Spleen Center' },
    { key: 'parenting_hd_center_root',           label: 'Root Center' },
    { key: 'parenting_hd_personality_gates',     label: 'Personality Gates' },
    { key: 'parenting_hd_design_gates',          label: 'Design Gates' },
    { key: 'parenting_hd_fear_gates',            label: 'Fear Gates' },
    { key: 'parenting_hd_melancholy_gates',      label: 'Melancholy Gates' },
    { key: 'parenting_hd_penta_qualities',       label: 'Penta Qualities' },
    { key: 'parenting_hd_variable_brain',        label: 'Brain (Determination)' },
    { key: 'parenting_hd_variable_setting',      label: 'Setting (Environment)' },
    { key: 'parenting_hd_variable_storyline',    label: 'Storyline (Perspective)' },
    { key: 'parenting_hd_variable_mind',         label: 'Mind (Sense)' },
  ]
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 0 80px' }}>
      <div style={{ padding: '48px 24px 32px', borderBottom: '1px solid rgba(154,124,46,0.15)' }}>
        <p style={{ fontFamily: 'var(--font-raleway, sans-serif)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', color: '#9a7c2e', textTransform: 'uppercase', marginBottom: '12px' }}>Parenting HD Report</p>
        <h1 style={{ fontFamily: 'var(--font-playfair, serif)', fontSize: '28px', fontWeight: 400, color: '#f4f1e8', lineHeight: '1.3', margin: 0 }}>Your Child's Human Design</h1>
      </div>
      {sections.map(s => (
        <ParentingHdSection key={s.key} label={s.label} content={String((childChart?.[s.key] as string | null) ?? '')} />
      ))}
    </div>
  )
}

export default function ParentingHdProductClient({
  chart: initialChart,
  childChart: initialChildChart,
  tier,
  hasIntake: initialHasIntake,
  hasChildChart: initialHasChildChart,
}: ParentingHdProductClientProps) {
  const supabase = createClient()
  const [childChart, setChildChart]           = useState<Record<string, unknown> | null>(initialChildChart)
  const [generating, setGenerating]           = useState(false)
  const [done, setDone]                       = useState(0)
  const [total, setTotal]                     = useState(0)
  const [intakeComplete, setIntakeComplete]   = useState(initialHasIntake)
  const [childChartReady, setChildChartReady] = useState(initialHasChildChart)
  const [phase, setPhase]                     = useState<'form' | 'report'>(initialHasIntake ? 'report' : 'form')
  const chartIdRef = useRef<string>(String(initialChart.id ?? ''))
  chartIdRef.current = String(initialChart.id ?? '') // keep stable ref

  const refreshChildChart = useCallback(async (childId: string) => {
    const { data } = await supabase.from('charts').select('*').eq('id', childId).single()
    if (data) setChildChart(data as Record<string, unknown>)
  }, [supabase])

  const fetchChildChart = useCallback(async () => {
    const { data } = await supabase.from('charts').select('*').eq('user_id', String(initialChart.user_id)).eq('chart_label', 'child').maybeSingle()
    if (data) { setChildChart(data as Record<string, unknown>); setChildChartReady(true) }
  }, [supabase, initialChart.user_id])

  useEffect(() => {
    if (!intakeComplete || !childChartReady) return
    const cid = (childChart?.id as string | undefined) ?? ''
    if (!cid) return

    const cc = childChart as Record<string, unknown>
    const missing = PARENTING_HD_COLUMNS.filter(col => { const v = cc[col]; return !v || typeof v !== 'string' || (v as string).trim() === '' })
    if (missing.length === 0) return

    const skipColumns = PARENTING_HD_COLUMNS.filter(c => !missing.includes(c))
    const intakeData  = (initialChart.intake_parenting) as Record<string, string> | null

    setGenerating(true); setTotal(missing.length); setDone(0)
    let cancelled = false, completedCount = 0

    async function stream() {
      try {
        const res = await fetch('/api/interpret-hd-parenting', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chart_json: cc.chart_json, tier, chart_id: cid, skip_columns: skipColumns, intake_json: intakeData ?? null }),
        })
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
              if (ev.done) { await refreshChildChart(cid); if (!cancelled) setGenerating(false); return }
              if (ev.status === 'done' || ev.status === 'error') { completedCount++; if (!cancelled) setDone(completedCount); await refreshChildChart(cid) }
            } catch { /* skip */ }
          }
        }
      } catch (err) { console.error('[ParentingHdProductClient]', err) }
      finally { if (!cancelled) setGenerating(false) }
    }

    stream()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intakeComplete, childChartReady])

  if (phase === 'form') {
    return (
      <ParentingIntakeForm
        chartId={String(initialChart.id ?? '')}
        initialAnswers={(initialChart.intake_parenting as Record<string, string> | undefined) ?? undefined}
        onComplete={async (childChartId) => {
          await fetchChildChart()
          setIntakeComplete(true)
          setPhase('report')
        }}
      />
    )
  }

  return (
    <>
      {generating && <ProgressBar done={done} total={total} />}
      <div style={{ paddingTop: generating ? '36px' : '0', backgroundColor: '#0e0c0b', minHeight: '100vh' }}>
        <Header />
        <ParentingHdReport childChart={childChart} />
      </div>
    </>
  )
}
