'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import RelationalIntakeForm from '@/components/intake/RelationalIntakeForm'

const SYNASTRY_COLUMNS = [
  'synastry_ashtakuta_total', 'synastry_nadi', 'synastry_bhakoot', 'synastry_gana',
  'synastry_graha_maitri', 'synastry_yoni', 'synastry_tara', 'synastry_vashya',
  'synastry_varna', 'synastry_mangal_dosha', 'synastry_rajju', 'synastry_vedha',
  'synastry_overlay_sun', 'synastry_overlay_moon', 'synastry_overlay_mars',
  'synastry_overlay_mercury', 'synastry_overlay_jupiter', 'synastry_overlay_venus',
  'synastry_overlay_saturn', 'synastry_overlay_rahu', 'synastry_overlay_ketu',
  'synastry_cross_aspects', 'synastry_7th_house', 'synastry_upapada_lagna',
  'synastry_karaka_compatibility', 'synastry_nakshatra_lords', 'synastry_dasha_comparison',
  'synastry_navamsa', 'synastry_jaimini_aspects', 'synastry_karmic_axis',
]

interface SynastryRow extends Record<string, unknown> {
  chart_id_a: string
  chart_id_b: string
}

interface SynastryProductClientProps {
  chart:              Record<string, unknown>
  partnerChart:       Record<string, unknown> | null
  synastryRow:        SynastryRow | null
  tier:               number
  hasIntake:          boolean
  hasPartnerChart:    boolean
  partnerIntakeComplete: boolean
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

function SynastrySection({ label, content }: { label: string; content: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid rgba(154,124,46,0.12)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', textAlign: 'left', padding: '18px 24px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
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

function SynastryReport({ synastryRow }: { synastryRow: SynastryRow | null }) {
  const sections = [
    { key: 'synastry_ashtakuta_total', label: 'Ashtakuta Score' },
    { key: 'synastry_nadi',            label: 'Nadi Koota' },
    { key: 'synastry_bhakoot',         label: 'Bhakoot Koota' },
    { key: 'synastry_gana',            label: 'Gana Koota' },
    { key: 'synastry_graha_maitri',    label: 'Graha Maitri' },
    { key: 'synastry_yoni',            label: 'Yoni Koota' },
    { key: 'synastry_tara',            label: 'Tara Koota' },
    { key: 'synastry_vashya',          label: 'Vashya Koota' },
    { key: 'synastry_varna',           label: 'Varna Koota' },
    { key: 'synastry_mangal_dosha',    label: 'Mangal Dosha' },
    { key: 'synastry_rajju',           label: 'Rajju' },
    { key: 'synastry_vedha',           label: 'Vedha' },
    { key: 'synastry_overlay_sun',     label: 'Sun Overlay' },
    { key: 'synastry_overlay_moon',    label: 'Moon Overlay' },
    { key: 'synastry_overlay_mars',    label: 'Mars Overlay' },
    { key: 'synastry_overlay_mercury', label: 'Mercury Overlay' },
    { key: 'synastry_overlay_jupiter', label: 'Jupiter Overlay' },
    { key: 'synastry_overlay_venus',   label: 'Venus Overlay' },
    { key: 'synastry_overlay_saturn',  label: 'Saturn Overlay' },
    { key: 'synastry_overlay_rahu',    label: 'Rahu Overlay' },
    { key: 'synastry_overlay_ketu',    label: 'Ketu Overlay' },
    { key: 'synastry_cross_aspects',   label: 'Cross-Chart Aspects' },
    { key: 'synastry_7th_house',       label: '7th House Analysis' },
    { key: 'synastry_upapada_lagna',   label: 'Upapada Lagna' },
    { key: 'synastry_karaka_compatibility', label: 'Karaka Compatibility' },
    { key: 'synastry_nakshatra_lords', label: 'Nakshatra Lords' },
    { key: 'synastry_dasha_comparison',label: 'Dasha Comparison' },
    { key: 'synastry_navamsa',         label: 'Navamsa Compatibility' },
    { key: 'synastry_jaimini_aspects', label: 'Jaimini Aspects' },
    { key: 'synastry_karmic_axis',     label: 'Karmic Axis' },
  ]

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 0 80px' }}>
      <div style={{ padding: '48px 24px 32px', borderBottom: '1px solid rgba(154,124,46,0.15)' }}>
        <p style={{ fontFamily: 'var(--font-raleway, sans-serif)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', color: '#9a7c2e', textTransform: 'uppercase', marginBottom: '12px' }}>
          Jyotish Synastry Report
        </p>
        <h1 style={{ fontFamily: 'var(--font-playfair, serif)', fontSize: '28px', fontWeight: 400, color: '#f4f1e8', lineHeight: '1.3', margin: 0 }}>
          Relationship Compatibility
        </h1>
      </div>
      {sections.map(s => (
        <SynastrySection
          key={s.key}
          label={s.label}
          content={String((synastryRow?.[s.key] as string | null) ?? '')}
        />
      ))}
    </div>
  )
}

export default function SynastryProductClient({
  chart: initialChart,
  partnerChart: initialPartnerChart,
  synastryRow: initialSynastryRow,
  hasIntake: initialHasIntake,
  hasPartnerChart: initialHasPartnerChart,
  partnerIntakeComplete,
}: SynastryProductClientProps) {
  const supabase = createClient()
  const [synastryRow, setSynastryRow] = useState<SynastryRow | null>(initialSynastryRow)
  const [partnerChart, setPartnerChart] = useState<Record<string, unknown> | null>(initialPartnerChart)
  const [generating, setGenerating] = useState(false)
  const [done, setDone]             = useState(0)
  const [total, setTotal]           = useState(0)
  const [intakeComplete, setIntakeComplete]       = useState(initialHasIntake)
  const [partnerChartReady, setPartnerChartReady] = useState(initialHasPartnerChart)
  const [phase, setPhase] = useState<'form' | 'report'>(initialHasIntake ? 'report' : 'form')
  const [partnerLink, setPartnerLink] = useState('')

  // Pair rows are RLS-locked; the route returns the caller's own row.
  const refreshSynastry = useCallback(async () => {
    const res = await fetch('/api/interpret-synastry', { cache: 'no-store' })
    if (!res.ok) return
    const { row } = await res.json() as { row: SynastryRow | null }
    if (row) setSynastryRow(row)
  }, [])

  // After intake save, re-fetch partner chart if it was just created
  const fetchPartnerChart = useCallback(async () => {
    const { data } = await supabase
      .from('charts')
      .select('id')
      .eq('user_id', (initialChart.user_id as string))
      .eq('chart_label', 'partner')
      .maybeSingle()
    if (data) { setPartnerChart(data as Record<string, unknown>); setPartnerChartReady(true) }
  }, [supabase, initialChart.user_id])

  useEffect(() => {
    // Nothing is generated until both partners have submitted.
    if (!intakeComplete || !partnerChartReady || !partnerIntakeComplete) return

    const pid = (partnerChart?.id as string | undefined) ?? ''
    if (!pid) return

    // Determine which columns are missing from synastryRow
    const row = synastryRow as Record<string, unknown> | null
    const missing = SYNASTRY_COLUMNS.filter(col => {
      const v = row?.[col]; return !v || typeof v !== 'string' || (v as string).trim() === ''
    })
    if (missing.length === 0) return


    setGenerating(true)
    setTotal(missing.length)
    setDone(0)

    let cancelled = false, completedCount = 0

    async function stream() {
      try {
        const res = await fetch('/api/interpret-synastry', {
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
              if (ev.done) { await refreshSynastry(); if (!cancelled) setGenerating(false); return }
              if (ev.status === 'done' || ev.status === 'error') { completedCount++; if (!cancelled) setDone(completedCount); await refreshSynastry() }
            } catch { /* skip */ }
          }
        }
      } catch (err) { console.error('[SynastryProductClient]', err) }
      finally { if (!cancelled) setGenerating(false) }
    }

    stream()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intakeComplete, partnerChartReady, partnerIntakeComplete])

  if (phase === 'form') {
    return (
      <RelationalIntakeForm
        chartId={String(initialChart.id ?? '')}
        initialAnswers={(initialChart.intake_relational as Record<string, string> | undefined) ?? undefined}
        onComplete={async (_partnerChartId, link) => {
          setPartnerLink(link)
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
        {partnerLink && (
          <p style={{ maxWidth: '860px', margin: '24px auto 0', padding: '0 24px', fontFamily: 'var(--font-raleway, sans-serif)', fontSize: '12px', color: 'rgba(244,241,232,0.7)', wordBreak: 'break-all' }}>
            Send this link to your partner to complete their intake: <a href={partnerLink} style={{ color: '#9a7c2e' }}>{partnerLink}</a>
          </p>
        )}
        {!partnerIntakeComplete && (
          <div style={{ maxWidth: '860px', margin: '24px auto 0', padding: '0 24px', fontFamily: 'Georgia, serif', fontSize: '15px', color: 'rgba(244,241,232,0.7)', lineHeight: 1.7 }}>
            <p>Your intake is submitted. Your reading generates after your partner submits theirs.</p>
            <button
              onClick={() => window.location.reload()}
              style={{ marginTop: '12px', backgroundColor: 'transparent', color: '#9a7c2e', border: '1px solid rgba(154,124,46,0.4)', borderRadius: '3px', padding: '10px 20px', fontFamily: 'var(--font-raleway, sans-serif)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer' }}
            >
              Check again
            </button>
          </div>
        )}
        <SynastryReport synastryRow={synastryRow} />
      </div>
    </>
  )
}
