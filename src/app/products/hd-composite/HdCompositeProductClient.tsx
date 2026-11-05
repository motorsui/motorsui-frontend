'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import RelationalIntakeForm from '@/components/intake/RelationalIntakeForm'
import PartnerInvitePanel from '@/components/intake/PartnerInvitePanel'

interface CompositeRow extends Record<string, unknown> {
  chart_id_a: string
  chart_id_b: string
}

// Per-channel section, as listed by GET /api/interpret-composite. Its text is
// stored in row[map][key].
interface ChannelSection {
  column: string
  map:    string
  key:    string
  label:  string
}

interface HdCompositeProductClientProps {
  chart:           Record<string, unknown>
  partnerChart:    Record<string, unknown> | null
  compositeRow:    CompositeRow | null
  tier:            number
  hasIntake:       boolean
  hasPartnerChart: boolean
  partnerIntakeComplete: boolean
  readingsAvailable: boolean
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

function CompositeSection({ label, content }: { label: string; content: string }) {
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

function CompositeReport({ compositeRow, channels }: { compositeRow: CompositeRow | null; channels: ChannelSection[] }) {
  const sections = [
    { key: 'composite_relationship_theme',     label: 'Relationship Theme' },
    { key: 'composite_profile_compatibility',  label: 'Profile Compatibility' },
    { key: 'composite_type_compatibility',     label: 'Type Compatibility' },
    { key: 'composite_split_bridge',           label: 'Split Bridge' },
    { key: 'composite_circuit_field',          label: 'Circuit Field' },
    { key: 'composite_conditioning_triggers',  label: 'Conditioning Triggers' },
    { key: 'composite_group_roles',            label: 'Group Roles' },
    { key: 'composite_ancestral_views',        label: 'Ancestral Views' },
    { key: 'composite_gate_line_resonance',    label: 'Gate Line Resonance' },
    { key: 'composite_karmic_axis',            label: 'Karmic Axis' },
  ]
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 0 80px' }}>
      <div style={{ padding: '48px 24px 32px', borderBottom: '1px solid rgba(154,124,46,0.15)' }}>
        <p style={{ fontFamily: 'var(--font-raleway, sans-serif)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', color: '#9a7c2e', textTransform: 'uppercase', marginBottom: '12px' }}>HD Composite</p>
        <h1 style={{ fontFamily: 'var(--font-playfair, serif)', fontSize: '28px', fontWeight: 400, color: '#f4f1e8', lineHeight: '1.3', margin: 0 }}>Human Design Compatibility</h1>
      </div>
      {sections.map(s => (
        <CompositeSection key={s.key} label={s.label} content={String((compositeRow?.[s.key] as string | null) ?? '')} />
      ))}
      {channels.map(c => (
        <CompositeSection key={c.column} label={c.label}
          content={String(((compositeRow?.[c.map] as Record<string, string> | null | undefined)?.[c.key]) ?? '')} />
      ))}
    </div>
  )
}

export default function HdCompositeProductClient({
  chart: initialChart,
  partnerChart: initialPartnerChart,
  compositeRow: initialCompositeRow,
  hasIntake: initialHasIntake,
  hasPartnerChart: initialHasPartnerChart,
  partnerIntakeComplete,
  readingsAvailable,
}: HdCompositeProductClientProps) {
  const supabase = createClient()
  const [compositeRow, setCompositeRow] = useState<CompositeRow | null>(initialCompositeRow)
  const [partnerChart, setPartnerChart] = useState<Record<string, unknown> | null>(initialPartnerChart)
  const [generating, setGenerating] = useState(false)
  const [done, setDone]             = useState(0)
  const [total, setTotal]           = useState(0)
  const [intakeComplete, setIntakeComplete]       = useState(initialHasIntake)
  const [partnerChartReady, setPartnerChartReady] = useState(initialHasPartnerChart)
  const [phase, setPhase] = useState<'form' | 'report'>(initialHasIntake ? 'report' : 'form')
  const [channels, setChannels] = useState<ChannelSection[]>([])

  const refreshComposite = useCallback(async (): Promise<string[] | null> => {
    const res = await fetch('/api/interpret-composite', { cache: 'no-store' })
    if (!res.ok) return null
    const { row, channels: list, pending } = await res.json() as { row: CompositeRow | null; channels: ChannelSection[]; pending: string[] | null }
    if (row) setCompositeRow(row)
    setChannels(list)
    return pending
  }, [])

  const fetchPartnerChart = useCallback(async () => {
    const { data } = await supabase.from('charts').select('id').eq('user_id', String(initialChart.user_id)).eq('chart_label', 'partner').maybeSingle()
    if (data) { setPartnerChart(data as Record<string, unknown>); setPartnerChartReady(true) }
  }, [supabase, initialChart.user_id])

  useEffect(() => {
    // Nothing is generated until both partners have submitted.
    if (!readingsAvailable || !intakeComplete || !partnerChartReady || !partnerIntakeComplete) return
    if (!partnerChart?.id) return
    let cancelled = false, completedCount = 0

    async function stream() {
      try {
        const missing = await refreshComposite()
        if (cancelled || !missing || missing.length === 0) return
        setGenerating(true); setTotal(missing.length); setDone(0)
        const res = await fetch('/api/interpret-composite', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ columns: missing }),
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
              if (ev.done) { await refreshComposite(); if (!cancelled) setGenerating(false); return }
              if (ev.status === 'done' || ev.status === 'error') { completedCount++; if (!cancelled) setDone(completedCount); await refreshComposite() }
            } catch { /* skip */ }
          }
        }
      } catch (err) { console.error('[HdCompositeProductClient]', err) }
      finally { if (!cancelled) setGenerating(false) }
    }

    stream()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readingsAvailable, intakeComplete, partnerChartReady, partnerIntakeComplete])

  if (phase === 'form') {
    return (
      <RelationalIntakeForm
        chartId={String(initialChart.id ?? '')}
        initialAnswers={(initialChart.intake_relational as Record<string, string> | undefined) ?? undefined}
        onComplete={async () => {
          await fetchPartnerChart()
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
        {!partnerIntakeComplete && <PartnerInvitePanel />}
        {partnerIntakeComplete && !readingsAvailable && (
          <p style={{ maxWidth: '860px', margin: '24px auto 0', padding: '0 24px', fontFamily: 'Georgia, serif', fontSize: '15px', color: 'rgba(244,241,232,0.7)', lineHeight: 1.7 }}>
            Both intakes are submitted. Readings are not yet available.
          </p>
        )}
        <CompositeReport compositeRow={compositeRow} channels={channels} />
      </div>
    </>
  )
}
