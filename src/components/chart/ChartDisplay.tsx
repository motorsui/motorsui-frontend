'use client'

import { useState } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

type ChartRecord = Record<string, unknown>

export type ChartMode = 'traditional' | 'modern'

interface ChartDisplayProps {
  chart:        ChartRecord | null
  chartJson?:   unknown
  tier:         number
  mode:         ChartMode
  onModeChange: (m: ChartMode) => void
}

// ─── Accordion config (D-1 astrology) ─────────────────────────────────────────

interface RowConfig {
  label:  string
  column: string | null
}

interface GroupConfig {
  id:     string
  header: string
  rows:   RowConfig[]
}

const TRADITIONAL_PLANET_ROWS: RowConfig[] = [
  { label: 'Sun',     column: 'interp_sun'     },
  { label: 'Moon',    column: 'interp_moon'    },
  { label: 'Mercury', column: 'interp_mercury' },
  { label: 'Venus',   column: 'interp_venus'   },
  { label: 'Mars',    column: 'interp_mars'    },
  { label: 'Jupiter', column: 'interp_jupiter' },
  { label: 'Saturn',  column: 'interp_saturn'  },
]

const MODERN_PLANET_ROWS: RowConfig[] = [
  { label: 'Uranus',         column: 'interp_uranus'  },
  { label: 'Neptune',        column: 'interp_neptune' },
  { label: 'Pluto',          column: 'interp_pluto'   },
  { label: 'Chiron',         column: null },
  { label: 'Juno',           column: null },
  { label: 'Lilith',         column: null },
  { label: 'Vertex',         column: null },
  { label: 'Lot of Fortune', column: null },
]

function getAstroGroups(mode: ChartMode): GroupConfig[] {
  const outerBodiesGroup: GroupConfig = {
    id: 'outer', header: 'OUTER BODIES & POINTS', rows: MODERN_PLANET_ROWS,
  }
  return [
    { id: 'lagna', header: 'LAGNA', rows: [
      { label: 'Lagna (Ascendant)',      column: 'interp_lagna'           },
      { label: 'Lagna Lord',             column: 'interp_lagna_lord'      },
      { label: 'Lagna Nakshatra & Pada', column: 'interp_lagna_nakshatra' },
    ]},
    { id: 'planets', header: 'PLANETS', rows: TRADITIONAL_PLANET_ROWS },
    ...(mode === 'modern' ? [outerBodiesGroup] : []),
    { id: 'nodes', header: 'RAHU / KETU AXIS', rows: [
      { label: 'Rahu',        column: 'interp_rahu'          },
      { label: 'Ketu',        column: 'interp_ketu'          },
      { label: 'Nodal Story', column: 'interp_rahu_ketu_axis'},
    ]},
    { id: 'dignities', header: 'DIGNITIES & STRENGTH', rows: [
      { label: 'Planetary Dignities', column: 'interp_dignities' },
      { label: 'Shadbala Strength',   column: null               },
    ]},
    { id: 'aspects', header: 'ASPECTS', rows: [
      { label: 'All Active Aspects', column: 'interp_aspects' },
      { label: 'Special Aspects',    column: null             },
    ]},
    { id: 'yogas', header: 'YOGAS', rows: [
      { label: 'Active Yogas', column: 'interp_yogas' },
      { label: 'Raja Yogas',   column: null           },
      { label: 'Dhana Yogas',  column: null           },
      { label: 'Moksha Yogas', column: null           },
    ]},
    { id: 'arudha', header: 'ARUDHA PADAS', rows: [
      { label: 'Arudha Lagna', column: 'interp_arudha_padas' },
      { label: 'Dhana Pada',   column: null },
      { label: 'Vikrama Pada', column: null },
      { label: 'Matri Pada',   column: null },
      { label: 'Mantra Pada',  column: null },
      { label: 'Roga Pada',    column: null },
      { label: 'Dara Pada',    column: null },
      { label: 'Ashtama Pada', column: null },
      { label: 'Bhagya Pada',  column: null },
      { label: 'Karma Pada',   column: null },
      { label: 'Labha Pada',   column: null },
      { label: 'Vyaya Pada',   column: null },
    ]},
    { id: 'dashas', header: 'DASHAS', rows: [
      { label: 'Vimshottari Dasha',      column: 'interp_mahadasha'        },
      { label: 'Active Mahadasha',        column: 'interp_mahadasha'        },
      { label: 'Active Antardasha',       column: 'interp_antardasha'       },
      { label: 'Active Pratyantar Dasha', column: 'interp_pratyantar'       },
      { label: 'Upcoming Transitions',    column: 'interp_dasha_transitions'},
    ]},
    { id: 'purusharthas', header: 'PURUSHARTHAS', rows: [
      { label: 'Dharma · Artha · Kama · Moksha Balance', column: 'interp_purusharthas' },
    ]},
  ]
}

// ─── D-Charts accordion config ────────────────────────────────────────────────

const DCHART_GROUPS: GroupConfig[] = [
  { id: 'd2',  header: 'D2 HORA — WEALTH',                   rows: [{ label: 'Wealth, Material Resources, Financial Potential',             column: 'interp_d2'  }] },
  { id: 'd3',  header: 'D3 DREKKANA — SIBLINGS',             rows: [{ label: 'Siblings, Courage, Short Journeys, Initiative',               column: 'interp_d3'  }] },
  { id: 'd4',  header: 'D4 CHATURTHAMSA — FORTUNE',          rows: [{ label: 'Property, Land, Fortune, Home Environment',                   column: 'interp_d4'  }] },
  { id: 'd5',  header: 'D5 PANCHAMSA — SPIRITUAL',           rows: [{ label: 'Spiritual Tendencies, Devotional Nature, Worship Patterns',   column: 'interp_d5'  }] },
  { id: 'd6',  header: 'D6 SHASHTHAMSA — HEALTH',            rows: [{ label: 'Health, Physical Constitution, Enemies, Obstacles',           column: 'interp_d6'  }] },
  { id: 'd7',  header: 'D7 SAPTAMSA — CHILDREN',             rows: [{ label: 'Children, Creative Intelligence, Legacy Transmission',        column: 'interp_d7'  }] },
  { id: 'd8',  header: 'D8 ASHTAMSA — OBSTACLES',            rows: [{ label: 'Chronic Obstacles, Longevity Challenges, Karmic Debts',       column: 'interp_d8'  }] },
  { id: 'd9',  header: 'D9 NAVAMSA — SOUL',                  rows: [{ label: 'Soul Purpose, Dharmic Marriage, Inner Life Post-30',          column: 'interp_d9'  }] },
  { id: 'd10', header: 'D10 DASAMSA — CAREER',               rows: [{ label: 'Career, Public Role, Professional Vocation, Contribution',    column: 'interp_d10' }] },
  { id: 'd11', header: 'D11 RUDRAMSA — TRANSFORMATION',      rows: [{ label: 'Death, Transformation, Deep Endings, Cycle Completion',       column: 'interp_d11' }] },
  { id: 'd12', header: 'D12 DVADASAMSA — PARENTS',           rows: [{ label: 'Parents, Ancestry, Lineage Inheritance, Karmic Family Field', column: 'interp_d12' }] },
  { id: 'd16', header: 'D16 SHODASAMSA — COMFORTS',          rows: [{ label: 'Vehicles, Comforts, Material Pleasures, Sensory Life',        column: 'interp_d16' }] },
  { id: 'd20', header: 'D20 VIMSAMSA — SPIRITUAL PRACTICE',  rows: [{ label: 'Spiritual Practice, Devotional Discipline, Inner Worship',    column: 'interp_d20' }] },
  { id: 'd24', header: 'D24 CHATURVIMSAMSA — EDUCATION',     rows: [{ label: 'Education, Formal Learning, Skill Acquisition, Study',        column: 'interp_d24' }] },
  { id: 'd27', header: 'D27 BHAMSA — VITALITY',              rows: [{ label: 'Strength, Natural Vitality, Innate Gifts, Pranic Resources',  column: 'interp_d27' }] },
  { id: 'd30', header: 'D30 TRIMSAMSA — KARMA',              rows: [{ label: 'Misfortune, Suffering, Karmic Difficulty, Loss Patterns',     column: 'interp_d30' }] },
  { id: 'd40', header: 'D40 KHAVEDAMSA — INFLUENCES',        rows: [{ label: 'Auspicious and Inauspicious Planetary Influences',           column: 'interp_d40' }] },
  { id: 'd45', header: 'D45 AKSHAVEDAMSA — LIFE QUALITY',    rows: [{ label: 'Overall Life Quality Across All Domains',                    column: 'interp_d45' }] },
  { id: 'd60', header: 'D60 SHASTIAMSA — PAST LIFE',         rows: [{ label: 'Past Life Karma, Fate, Soul Imprints, Karmic Debt',          column: 'interp_d60' }] },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanText(raw: string): string {
  return raw.replace(/[*#]+/g, '').replace(/\n{3,}/g, '\n\n').trim()
}

function getContent(chart: ChartRecord | null, column: string | null): string | null {
  if (!chart || !column) return null
  const val = chart[column]
  if (!val || typeof val !== 'string' || val.trim() === '') return null
  return cleanText(val)
}

function getJsonb(chart: ChartRecord | null, column: string): Record<string, string> {
  if (!chart) return {}
  const val = chart[column]
  if (!val || typeof val !== 'object' || Array.isArray(val)) return {}
  return val as Record<string, string>
}

// ─── HD data helpers ──────────────────────────────────────────────────────────

function getHD(chartJson: unknown): Record<string, unknown> {
  return ((chartJson as Record<string, unknown>)?.hd as Record<string, unknown>) ?? {}
}

function getBirth(chartJson: unknown): Record<string, unknown> {
  return ((chartJson as Record<string, unknown>)?.birth as Record<string, unknown>) ?? {}
}

function sv(v: unknown): string {
  if (v == null || v === '') return '—'
  return String(v)
}

function toArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

function toObj(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>
  return {}
}

// ─── HD display primitives ────────────────────────────────────────────────────

function HDRow({ label, value, mono }: { label: string; value: unknown; mono?: boolean }) {
  return (
    <div
      style={{
        display:       'flex',
        justifyContent:'space-between',
        alignItems:    'flex-start',
        padding:       '10px 20px',
        borderBottom:  '1px solid rgba(154,124,46,0.08)',
        gap:           '16px',
      }}
    >
      <span
        style={{
          fontFamily:    'var(--font-raleway, sans-serif)',
          fontSize:      '10px',
          fontWeight:    600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color:         'rgba(154,124,46,0.6)',
          flexShrink:    0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: mono ? 'monospace' : 'Georgia, serif',
          fontSize:   '13px',
          color:      '#f4f1e8',
          textAlign:  'right',
          lineHeight: 1.5,
        }}
      >
        {sv(value)}
      </span>
    </div>
  )
}

function HDNumRow({ label, num, name }: { label: string; num: unknown; name: unknown }) {
  return (
    <div
      style={{
        display:       'flex',
        justifyContent:'space-between',
        alignItems:    'flex-start',
        padding:       '10px 20px',
        borderBottom:  '1px solid rgba(154,124,46,0.08)',
        gap:           '16px',
      }}
    >
      <span
        style={{
          fontFamily:    'var(--font-raleway, sans-serif)',
          fontSize:      '10px',
          fontWeight:    600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color:         'rgba(154,124,46,0.6)',
          flexShrink:    0,
        }}
      >
        {label}
      </span>
      <span style={{ textAlign: 'right', lineHeight: 1.5 }}>
        {num != null && (
          <span style={{ fontFamily: 'Georgia, serif', fontSize: '11px', color: '#c4a96a', marginRight: '8px' }}>
            {sv(num)}
          </span>
        )}
        <span style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#f4f1e8' }}>
          {sv(name)}
        </span>
      </span>
    </div>
  )
}

function HDSubHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        padding:         '10px 20px 6px',
        backgroundColor: 'rgba(154,124,46,0.05)',
        borderBottom:    '1px solid rgba(154,124,46,0.1)',
      }}
    >
      <span
        style={{
          fontFamily:    'var(--font-raleway, sans-serif)',
          fontSize:      '9px',
          fontWeight:    700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color:         'rgba(154,124,46,0.55)',
        }}
      >
        {label}
      </span>
    </div>
  )
}

function HDDistRow({ label, count }: { label: string; count: unknown }) {
  return (
    <div
      style={{
        display:       'flex',
        justifyContent:'space-between',
        padding:       '7px 20px',
        borderBottom:  '1px solid rgba(154,124,46,0.06)',
      }}
    >
      <span style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#f4f1e8' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#c4a96a', fontWeight: 600 }}>
        {sv(count)}
      </span>
    </div>
  )
}

// ─── HD Sections ──────────────────────────────────────────────────────────────

const PLANET_ORDER = [
  'Sun','Earth','NorthNode','SouthNode','Moon',
  'Mercury','Venus','Mars','Jupiter','Saturn',
  'Uranus','Neptune','Pluto',
]

const PLANET_LABELS: Record<string, string> = {
  NorthNode: 'North Node',
  SouthNode: 'South Node',
}

function HDOverview({ hd }: { hd: Record<string, unknown> }) {
  const cross =
    typeof hd.incarnation_cross === 'string'
      ? hd.incarnation_cross
      : sv(toObj(hd.incarnation_cross).name ?? toObj(hd.incarnation_cross).cross)

  return (
    <>
      <HDRow label="Type"              value={hd.type} />
      <HDRow label="Strategy"          value={hd.strategy} />
      <HDRow label="Authority"         value={hd.authority} />
      <HDRow label="Profile"           value={hd.profile} />
      <HDRow label="Definition"        value={hd.definition} />
      <HDRow label="Signature"         value={hd.signature} />
      <HDRow label="Not-Self Theme"    value={hd.not_self_theme ?? hd.notSelfTheme ?? hd.not_self} />
      <HDRow label="Incarnation Cross" value={cross} />
    </>
  )
}

function HDChannels({ hd }: { hd: Record<string, unknown> }) {
  const channels = toArr(hd.defined_channels ?? hd.channels)
  if (!channels.length) return <HDRow label="No defined channels" value="" />
  return (
    <>
      {channels.map((ch, i) => {
        const c = toObj(ch)
        const gates   = toArr(c.gates)
        const gateStr = gates.length === 2 ? `${gates[0]}-${gates[1]}` : sv(c.channel ?? c.id)
        const name    = sv(c.name)
        const circuit = sv(c.circuit ?? c.circuit_group)
        return (
          <div
            key={i}
            style={{
              display:       'flex',
              justifyContent:'space-between',
              alignItems:    'center',
              padding:       '10px 20px',
              borderBottom:  '1px solid rgba(154,124,46,0.08)',
              gap:           '12px',
            }}
          >
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#c4a96a', fontWeight: 600, flexShrink: 0 }}>
              {gateStr}
            </span>
            <span style={{ textAlign: 'right' }}>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#f4f1e8' }}>
                {name}
              </span>
              {circuit !== '—' && (
                <span
                  style={{
                    fontFamily:    'var(--font-raleway, sans-serif)',
                    fontSize:      '9px',
                    fontWeight:    600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color:         'rgba(154,124,46,0.5)',
                    marginLeft:    '10px',
                  }}
                >
                  {circuit}
                </span>
              )}
            </span>
          </div>
        )
      })}
    </>
  )
}

function HDGateList({ positions }: { positions: unknown[] }) {
  return (
    <>
      {PLANET_ORDER.map(planet => {
        const pos = positions.find(p => {
          const obj   = toObj(p)
          const pName = sv(obj.planet)
          return (
            pName === planet ||
            pName.replace(/\s/g, '') === planet ||
            pName.toLowerCase() === planet.toLowerCase()
          )
        })
        if (!pos) return null
        const obj  = toObj(pos)
        const gate = obj.gate
        const line = obj.line
        const gl   = gate != null && line != null ? `${gate}.${line}` : sv(gate)
        const sign = obj.sign ? ` · ${sv(obj.sign)}` : ''
        return (
          <div
            key={planet}
            style={{
              display:       'flex',
              justifyContent:'space-between',
              padding:       '8px 20px',
              borderBottom:  '1px solid rgba(154,124,46,0.06)',
            }}
          >
            <span
              style={{
                fontFamily:    'var(--font-raleway, sans-serif)',
                fontSize:      '10px',
                fontWeight:    600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color:         'rgba(154,124,46,0.6)',
              }}
            >
              {PLANET_LABELS[planet] ?? planet}
            </span>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#c4a96a', fontWeight: 600 }}>
              {gl}
              <span style={{ color: 'rgba(154,124,46,0.5)', fontSize: '11px', fontWeight: 400 }}>
                {sign}
              </span>
            </span>
          </div>
        )
      })}
    </>
  )
}

function HDGates({ hd }: { hd: Record<string, unknown> }) {
  const pPos = toArr(hd.personality_positions ?? hd.personality)
  const dPos = toArr(hd.design_positions      ?? hd.design)
  return (
    <>
      <HDSubHeader label="Personality" />
      <HDGateList positions={pPos} />
      <HDSubHeader label="Design" />
      <HDGateList positions={dPos} />
    </>
  )
}

function HDShadowGates({ hd }: { hd: Record<string, unknown> }) {
  const fear   = toArr(hd.fear_gates       ?? hd.fearGates)
  const mel    = toArr(hd.melancholy_gates ?? hd.melancholyGates)
  const pentaQ = toObj(hd.penta_qualities  ?? hd.pentaQualities)

  const PENTA_LABELS: Record<string, string> = {
    '1': 'L1 — Detail',     '2': 'L2 — Potential',    '3': 'L3 — Determination',
    '4': 'L4 — Networking', '5': 'L5 — Marketing',    '6': 'L6 — Leadership',
    L1:  'L1 — Detail',     L2:  'L2 — Potential',    L3:  'L3 — Determination',
    L4:  'L4 — Networking', L5:  'L5 — Marketing',    L6:  'L6 — Leadership',
  }

  function gateNums(gates: unknown[]): string {
    return gates.map(g => { const o = toObj(g); return o.gate ?? o.number ?? g }).join(' · ')
  }

  return (
    <>
      {fear.length > 0 && (
        <>
          <HDSubHeader label="Fear Gates" />
          <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(154,124,46,0.08)' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#f4f1e8', lineHeight: 1.8 }}>
              {gateNums(fear)}
            </span>
          </div>
        </>
      )}
      {mel.length > 0 && (
        <>
          <HDSubHeader label="Melancholy Gates" />
          <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(154,124,46,0.08)' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#f4f1e8', lineHeight: 1.8 }}>
              {gateNums(mel)}
            </span>
          </div>
        </>
      )}
      {Object.keys(pentaQ).length > 0 && (
        <>
          <HDSubHeader label="Penta Qualities" />
          {Object.entries(pentaQ).map(([k, v]) => (
            <HDDistRow key={k} label={PENTA_LABELS[k] ?? k} count={v} />
          ))}
        </>
      )}
    </>
  )
}

function HDVariables({ hd }: { hd: Record<string, unknown> }) {
  const vars      = toObj(hd.variables)
  const brain     = toObj(vars.brain      ?? hd.brain)
  const setting   = toObj(vars.setting    ?? hd.setting)
  const storyline = toObj(vars.storyline  ?? hd.storyline)
  const mind      = toObj(vars.mind       ?? hd.mind)

  const get = (obj: Record<string, unknown>, ...keys: string[]) => {
    for (const k of keys) if (obj[k] != null) return obj[k]
    return null
  }

  const cognition     = get(brain,     'cognition',     'cognition_name')     ?? hd.cognition
  const cogTone       = get(brain,     'cognition_tone','cognition_tone_num')
  const determination = get(brain,     'determination', 'determination_name') ?? hd.determination
  const detColor      = get(brain,     'determination_color','det_color_num')
  const brainOrient   = get(brain,     'orientation') ?? '—'

  const environment   = get(setting, 'environment', 'environment_name') ?? hd.environment
  const envColor      = get(setting, 'environment_color','env_color_num')
  const awareness     = get(setting, 'awareness',   'awareness_name')   ?? hd.awareness
  const awarenessT    = get(setting, 'awareness_tone')
  const settingOrient = get(setting, 'orientation') ?? '—'

  const perspective   = get(storyline,'perspective','view','perspective_name') ?? hd.view ?? hd.perspective
  const perspColor    = get(storyline,'perspective_color','view_color')
  const view          = get(storyline,'distraction','view_name','distraction_name') ?? hd.distraction
  const viewTone      = get(storyline,'view_tone','distraction_tone')
  const storyOrient   = get(storyline,'orientation') ?? '—'

  const motivation    = get(mind, 'motivation', 'motivation_name') ?? hd.motivation
  const motivColor    = get(mind, 'motivation_color','motiv_color_num')
  const transference  = get(mind, 'transference','transference_name') ?? hd.transference
  const transferTone  = get(mind, 'transference_tone','transfer_tone_num')
  const mindOrient    = get(mind, 'orientation') ?? '—'

  const varString = sv(vars.string ?? vars.variables_string ?? hd.variable_string ?? hd.variables_string)

  return (
    <>
      {varString !== '—' && <HDRow label="Variables" value={varString} mono />}
      <HDSubHeader label="Brain — Dependent Design" />
      <HDRow     label="Orientation"                      value={brainOrient}  />
      <HDNumRow  label="Color — Determination (Digestion)" num={detColor}   name={determination} />
      <HDNumRow  label="Tone — Cognition"                  num={cogTone}    name={cognition}     />
      <HDSubHeader label="Setting — Independent Design" />
      <HDRow     label="Orientation"                      value={settingOrient} />
      <HDNumRow  label="Color — Environment"  num={envColor}    name={environment} />
      <HDNumRow  label="Tone — Awareness"     num={awarenessT}  name={awareness}   />
      <HDSubHeader label="Storyline — Independent Personality" />
      <HDRow     label="Orientation"                      value={storyOrient} />
      <HDNumRow  label="Color — Perspective"  num={perspColor}  name={perspective} />
      <HDNumRow  label="Tone — View"          num={viewTone}    name={view}        />
      <HDSubHeader label="Mind — Dependent Personality" />
      <HDRow     label="Orientation"                      value={mindOrient} />
      <HDNumRow  label="Color — Motivation"   num={motivColor}  name={motivation}  />
      <HDNumRow  label="Tone — Transference"  num={transferTone} name={transference} />
    </>
  )
}

function HDDistributions({ hd }: { hd: Record<string, unknown> }) {
  const gateVars   = toObj(hd.gate_variables ?? hd.gateVariables)
  const yinYang    = toObj(hd.yin_yang_gates ?? hd.yinYangGates)
  const yinYangD   = toObj(yinYang.design)
  const yinYangP   = toObj(yinYang.personality)
  const yinYangAll = toObj(yinYang.combined ?? yinYang.all)
  const lines      = toObj(hd.lines  ?? hd.line_distribution)
  const colors     = toObj(hd.colors ?? hd.color_distribution)
  const pentaLines = toObj(hd.penta_lines ?? hd.pentaLines)

  const PENTA_LINE_LABELS: Record<string, string> = {
    '1': 'L1 — Detail',     '2': 'L2 — Potential',    '3': 'L3 — Determination',
    '4': 'L4 — Networking', '5': 'L5 — Marketing',    '6': 'L6 — Leadership',
    L1:  'L1 — Detail',     L2:  'L2 — Potential',    L3:  'L3 — Determination',
    L4:  'L4 — Networking', L5:  'L5 — Marketing',    L6:  'L6 — Leadership',
  }

  return (
    <>
      {Object.keys(lines).length > 0 && (
        <>
          <HDSubHeader label="Lines" />
          {Object.entries(lines).map(([k, v]) => <HDDistRow key={k} label={k} count={v} />)}
        </>
      )}
      {Object.keys(colors).length > 0 && (
        <>
          <HDSubHeader label="Colors" />
          {Object.entries(colors).map(([k, v]) => <HDDistRow key={k} label={k} count={v} />)}
        </>
      )}
      {(Object.keys(yinYangD).length > 0 || Object.keys(yinYangP).length > 0) && (
        <>
          <HDSubHeader label="Yin / Yang — Design" />
          {Object.entries(yinYangD).map(([k, v]) => <HDDistRow key={k} label={k} count={v} />)}
          <HDSubHeader label="Yin / Yang — Personality" />
          {Object.entries(yinYangP).map(([k, v]) => <HDDistRow key={k} label={k} count={v} />)}
          {Object.keys(yinYangAll).length > 0 && (
            <>
              <HDSubHeader label="Yin / Yang — Combined" />
              {Object.entries(yinYangAll).map(([k, v]) => <HDDistRow key={k} label={k} count={v} />)}
            </>
          )}
        </>
      )}
      {Object.keys(gateVars).length > 0 && (
        <>
          <HDSubHeader label="Gate Variables" />
          {Object.entries(gateVars).map(([dir, count]) => <HDDistRow key={dir} label={dir} count={count} />)}
        </>
      )}
      {Object.keys(pentaLines).length > 0 && (
        <>
          <HDSubHeader label="Penta Lines" />
          {Object.entries(pentaLines).map(([k, v]) => (
            <HDDistRow key={k} label={PENTA_LINE_LABELS[k] ?? k} count={v} />
          ))}
        </>
      )}
    </>
  )
}

function HDArchetypes({ hd }: { hd: Record<string, unknown> }) {
  const godheads  = toObj(hd.godheads)
  const ghQ       = toObj(hd.godhead_quarters ?? hd.godheadQuarters)
  const gateSigns = toObj(hd.gate_signs       ?? hd.gateSigns)
  const circuits  = toObj(hd.circuit_groups   ?? hd.circuitGroups)

  return (
    <>
      {Object.keys(godheads).length > 0 && (
        <>
          <HDSubHeader label="Godheads" />
          {Object.entries(godheads)
            .sort(([, a], [, b]) => Number(b) - Number(a))
            .map(([name, count]) => <HDDistRow key={name} label={name} count={count} />)}
        </>
      )}
      {Object.keys(ghQ).length > 0 && (
        <>
          <HDSubHeader label="Godhead Quarters" />
          {Object.entries(ghQ)
            .sort(([, a], [, b]) => Number(b) - Number(a))
            .map(([name, count]) => <HDDistRow key={name} label={name} count={count} />)}
        </>
      )}
      {Object.keys(gateSigns).length > 0 && (
        <>
          <HDSubHeader label="Gate Signs" />
          {Object.entries(gateSigns).map(([sign, count]) => <HDDistRow key={sign} label={sign} count={count} />)}
        </>
      )}
      {Object.keys(circuits).length > 0 && (
        <>
          <HDSubHeader label="Circuit Groups" />
          {Object.entries(circuits).map(([circuit, count]) => <HDDistRow key={circuit} label={circuit} count={count} />)}
        </>
      )}
    </>
  )
}

function HDCycles({ hd }: { hd: Record<string, unknown> }) {
  const t = toObj(hd.timing_events ?? hd.timingEvents ?? hd.cycles)

  const fields: Array<[string, unknown]> = [
    ['Saturn Return',        t.saturn_return        ?? t.saturnReturn        ?? hd.saturn_return],
    ['Uranus Opposition',    t.uranus_opposition    ?? t.uranusOpposition    ?? hd.uranus_opposition],
    ['Chiron Return',        t.chiron_return        ?? t.chironReturn        ?? hd.chiron_return],
    ['Second Saturn Return', t.second_saturn_return ?? t.secondSaturnReturn  ?? hd.second_saturn_return],
    ['Solar Return',         t.solar_return         ?? t.solarReturn         ?? hd.solar_return ?? 'Tap to select year'],
    ['Lunar Return',         t.lunar_return         ?? t.lunarReturn         ?? hd.lunar_return ?? 'Tap for more'],
  ]

  return (
    <>
      {fields.map(([label, value]) => (
        <HDRow key={label} label={label} value={value} />
      ))}
    </>
  )
}

function HDOther({ hd, birth }: { hd: Record<string, unknown>; birth: Record<string, unknown> }) {
  const fields: Array<[string, unknown]> = [
    ['Birth Date (Local)',     hd.birth_date_local     ?? birth.birth_date_local     ?? birth.birth_date],
    ['Design Date (Birth TZ)', hd.design_date_birth_tz ?? birth.design_date_birth_tz],
    ['Birth Date (UTC)',       hd.birth_date_utc       ?? birth.birth_date_utc],
    ['Design Date (UTC)',      hd.design_date_utc      ?? birth.design_date_utc],
    ['Location',               hd.location             ?? `${sv(birth.birth_city)}, ${sv(birth.birth_state ?? birth.birth_country)}`],
    ['Time Zone',              hd.timezone             ?? birth.timezone],
  ]

  return (
    <>
      {fields.map(([label, value]) => (
        <HDRow key={label as string} label={label as string} value={value} />
      ))}
    </>
  )
}

// ─── HD Static Panel (chart data) ────────────────────────────────────────────

function HDPanel({ chartJson }: { chartJson: unknown }) {
  const hd    = getHD(chartJson)
  const birth = getBirth(chartJson)

  const sections: Array<{ id: string; header: string; content: React.ReactNode }> = [
    { id: 'hd-overview',      header: 'OVERVIEW',                         content: <HDOverview      hd={hd} /> },
    { id: 'hd-channels',      header: 'CHANNELS',                         content: <HDChannels      hd={hd} /> },
    { id: 'hd-gates',         header: 'GATES',                            content: <HDGates         hd={hd} /> },
    { id: 'hd-shadow',        header: 'SHADOW GATES',                     content: <HDShadowGates   hd={hd} /> },
    { id: 'hd-variables',     header: 'FOUR TRANSFORMATIONS — VARIABLES',  content: <HDVariables    hd={hd} /> },
    { id: 'hd-distributions', header: 'DISTRIBUTIONS',                    content: <HDDistributions hd={hd} /> },
    { id: 'hd-archetypes',    header: 'ARCHETYPES',                       content: <HDArchetypes    hd={hd} /> },
    { id: 'hd-cycles',        header: 'CYCLES',                           content: <HDCycles        hd={hd} /> },
    { id: 'hd-other',         header: 'OTHER',                            content: <HDOther         hd={hd} birth={birth} /> },
  ]

  return (
    <div>
      {sections.map(sec => (
        <div key={sec.id}>
          <GroupHeader label={sec.header} />
          {sec.content}
        </div>
      ))}
    </div>
  )
}

// ─── HD Interpretation Panel (AI-generated text) ─────────────────────────────
//
// Renders hd_* interpretation columns from the chart DB record.
// Fixed sections use TEXT columns. Variable sections use JSONB columns
// (hd_channels, hd_gates) keyed by channel string or gate number.
// All accordion rows show "Generating..." when content is null — this is the
// correct state while the interpret-hd stream is running on the product page.

function HDInterpretationPanel({
  chart,
  openRows,
  onToggle,
  idPrefix,
}: {
  chart:    ChartRecord | null
  openRows: Set<string>
  onToggle: (key: string) => void
  idPrefix: string
}) {
  const hdChannels = getJsonb(chart, 'hd_channels')
  const hdGates    = getJsonb(chart, 'hd_gates')

  const fixedGroups: GroupConfig[] = [
    { id: 'hd-interp-overview', header: 'OVERVIEW', rows: [
      { label: 'Type, Strategy & Authority', column: 'hd_type_strategy_authority' },
      { label: 'Profile',                    column: 'hd_profile'                  },
      { label: 'Incarnation Cross',          column: 'hd_incarnation_cross'        },
      { label: 'Definition',                 column: 'hd_definition'               },
    ]},
    { id: 'hd-interp-centers', header: 'CENTERS', rows: [
      { label: 'Head Center',          column: 'hd_center_head'        },
      { label: 'Ajna Center',          column: 'hd_center_ajna'        },
      { label: 'Throat Center',        column: 'hd_center_throat'      },
      { label: 'G Center',             column: 'hd_center_g'           },
      { label: 'Heart / Ego Center',   column: 'hd_center_heart'       },
      { label: 'Sacral Center',        column: 'hd_center_sacral'      },
      { label: 'Solar Plexus Center',  column: 'hd_center_solar_plexus'},
      { label: 'Spleen Center',        column: 'hd_center_spleen'      },
      { label: 'Root Center',          column: 'hd_center_root'        },
    ]},
    { id: 'hd-interp-variables', header: 'VARIABLES', rows: [
      { label: 'The Four Transformations', column: 'hd_variables' },
    ]},
    { id: 'hd-interp-shadow', header: 'SHADOW GATES', rows: [
      { label: 'Fear Gates & Melancholy Gates', column: 'hd_shadow_gates' },
    ]},
    { id: 'hd-interp-circuits', header: 'CIRCUITS', rows: [
      { label: 'Circuit Map', column: 'hd_circuits' },
    ]},
    { id: 'hd-interp-timing', header: 'TIMING EVENTS', rows: [
      { label: 'Saturn Return, Uranus Opposition, Chiron Return, Second Saturn Return', column: 'hd_timing_events' },
    ]},
  ]

  const hasChannelInterp = Object.keys(hdChannels).length > 0
  const hasGateInterp    = Object.keys(hdGates).length > 0

  return (
    <div>
      {fixedGroups.map(group => (
        <div key={`${idPrefix}-${group.id}`}>
          <GroupHeader label={group.header} />
          {group.rows.map((row, rowIdx) => {
            const rowKey  = `${idPrefix}-${group.id}-${rowIdx}`
            const content = getContent(chart, row.column)
            return (
              <AccordionRow
                key={rowKey}
                rowKey={rowKey}
                label={row.label}
                content={content}
                isOpen={openRows.has(rowKey)}
                onToggle={() => onToggle(rowKey)}
              />
            )
          })}
        </div>
      ))}

      {hasChannelInterp && (
        <div>
          <GroupHeader label="CHANNELS" />
          {Object.entries(hdChannels).map(([channelKey, text]) => {
            const rowKey = `${idPrefix}-channel-${channelKey}`
            const content = text && text.trim() ? cleanText(text) : null
            return (
              <AccordionRow
                key={rowKey}
                rowKey={rowKey}
                label={`Channel ${channelKey}`}
                content={content}
                isOpen={openRows.has(rowKey)}
                onToggle={() => onToggle(rowKey)}
              />
            )
          })}
        </div>
      )}

      {hasGateInterp && (
        <div>
          <GroupHeader label="GATES" />
          {Object.entries(hdGates)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([gateKey, text]) => {
              const rowKey = `${idPrefix}-gate-${gateKey}`
              const content = text && text.trim() ? cleanText(text) : null
              return (
                <AccordionRow
                  key={rowKey}
                  rowKey={rowKey}
                  label={`Gate ${gateKey}`}
                  content={content}
                  isOpen={openRows.has(rowKey)}
                  onToggle={() => onToggle(rowKey)}
                />
              )
            })}
        </div>
      )}
    </div>
  )
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

type TabId = 'd1' | 'nakshatra' | 'dcharts' | 'hd'

function TabBar({
  active,
  tier,
  onChange,
  mode,
  onModeChange,
}: {
  active:       TabId
  tier:         number
  onChange:     (t: TabId) => void
  mode:         ChartMode
  onModeChange: (m: ChartMode) => void
}) {
  const [showTooltip, setShowTooltip] = useState(false)

  const tabStyle = (id: TabId): React.CSSProperties => ({
    padding:       '14px 24px',
    fontSize:      '11px',
    fontFamily:    'var(--font-raleway, sans-serif)',
    fontWeight:    600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color:         active === id ? '#c4a96a' : 'rgba(154,124,46,0.5)',
    background:    'none',
    border:        'none',
    borderBottom:  active === id ? '2px solid #c4a96a' : '2px solid transparent',
    cursor:        'pointer',
    transition:    'color 0.2s',
  })

  return (
    <div
      style={{
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        borderBottom:    '1px solid rgba(154,124,46,0.25)',
        backgroundColor: '#0e0c0b',
        paddingRight:    '16px',
      }}
    >
      <div style={{ display: 'flex' }}>
        <button onClick={() => onChange('d1')}        style={tabStyle('d1')}>D-1 Chart</button>
        <button onClick={() => onChange('nakshatra')} style={tabStyle('nakshatra')}>Nakshatra</button>
        <button onClick={() => onChange('hd')}        style={tabStyle('hd')}>Human Design</button>

        {/* D-Charts — locked for Tier 1 */}
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => tier === 1 && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <button
            onClick={() => tier > 1 && onChange('dcharts')}
            style={{
              ...tabStyle('dcharts'),
              color:   active === 'dcharts' && tier > 1 ? '#c4a96a' : 'rgba(154,124,46,0.3)',
              cursor:  tier === 1 ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            D-Charts
            {tier === 1 && (
              <svg width="11" height="13" viewBox="0 0 11 13" fill="none">
                <rect x="1" y="5" width="9" height="7" rx="1.5" stroke="rgba(154,124,46,0.4)" strokeWidth="1.2"/>
                <path d="M3.5 5V3.5a2 2 0 0 1 4 0V5" stroke="rgba(154,124,46,0.4)" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            )}
          </button>
          {showTooltip && tier === 1 && (
            <div
              style={{
                position:        'absolute',
                top:             'calc(100% + 6px)',
                left:            '50%',
                transform:       'translateX(-50%)',
                backgroundColor: '#1a1410',
                border:          '1px solid rgba(154,124,46,0.4)',
                color:           '#c4a96a',
                fontSize:        '10px',
                fontFamily:      'var(--font-raleway, sans-serif)',
                fontWeight:      600,
                letterSpacing:   '0.1em',
                textTransform:   'uppercase',
                padding:         '5px 10px',
                borderRadius:    '3px',
                whiteSpace:      'nowrap',
                zIndex:          10,
                pointerEvents:   'none',
              }}
            >
              Tier 2
            </div>
          )}
        </div>
      </div>

      {/* Traditional / Modern toggle — only shown on D-1 */}
      {active === 'd1' && (
        <div
          style={{
            display:         'flex',
            backgroundColor: 'rgba(154,124,46,0.1)',
            borderRadius:    '3px',
            border:          '1px solid rgba(154,124,46,0.25)',
            overflow:        'hidden',
          }}
        >
          {(['traditional', 'modern'] as ChartMode[]).map(m => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              style={{
                padding:       '5px 12px',
                fontSize:      '9px',
                fontFamily:    'var(--font-raleway, sans-serif)',
                fontWeight:    700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                background:    mode === m ? 'rgba(154,124,46,0.3)' : 'transparent',
                color:         mode === m ? '#c4a96a' : 'rgba(154,124,46,0.45)',
                border:        'none',
                cursor:        'pointer',
                transition:    'background 0.15s, color 0.15s',
              }}
            >
              {m === 'traditional' ? 'Traditional' : 'Modern'}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Chart Wheel Placeholder ──────────────────────────────────────────────────

function ChartWheelPlaceholder() {
  return (
    <div
      style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '40px 24px',
        borderBottom:   '1px solid rgba(154,124,46,0.15)',
      }}
    >
      <div
        style={{
          width:           '240px',
          height:          '240px',
          borderRadius:    '50%',
          border:          '1px solid #9a7c2e',
          backgroundColor: '#0e0c0b',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          flexDirection:   'column',
          gap:             '8px',
        }}
      >
        <span
          style={{
            color:         'rgba(154,124,46,0.5)',
            fontFamily:    'Georgia, serif',
            fontSize:      '13px',
            letterSpacing: '0.04em',
            textAlign:     'center',
            lineHeight:    1.5,
            padding:       '0 24px',
          }}
        >
          Chart Wheel
          <br />
          <span style={{ fontSize: '11px', opacity: 0.6 }}>Coming Soon</span>
        </span>
      </div>
    </div>
  )
}

// ─── Accordion Row ────────────────────────────────────────────────────────────

function AccordionRow({
  rowKey, label, content, isOpen, onToggle,
}: {
  rowKey:   string
  label:    string
  content:  string | null
  isOpen:   boolean
  onToggle: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{ borderBottom: '1px solid rgba(154,124,46,0.12)' }}>
      <button
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width:          '100%',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '13px 20px',
          background:     hovered ? 'rgba(154,124,46,0.08)' : 'transparent',
          border:         'none',
          cursor:         'pointer',
          textAlign:      'left',
          transition:     'background 0.15s',
        }}
      >
        <span
          style={{
            color:         '#9a7c2e',
            fontFamily:    'var(--font-raleway, sans-serif)',
            fontSize:      '11px',
            fontWeight:    600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
        <span
          style={{
            color:      'rgba(154,124,46,0.5)',
            fontSize:   '16px',
            lineHeight: 1,
            transform:  isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s ease',
            display:    'inline-block',
          }}
        >
          ›
        </span>
      </button>
      <div
        style={{
          display:          'grid',
          gridTemplateRows: isOpen ? '1fr' : '0fr',
          transition:       'grid-template-rows 0.28s ease',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div style={{ padding: '4px 20px 20px' }}>
            {content ? (
              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  color:      '#f4f1e8',
                  fontSize:   '15px',
                  lineHeight: '1.8',
                  whiteSpace: 'pre-wrap',
                  margin:     0,
                }}
              >
                {content}
              </p>
            ) : (
              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  color:      '#9a7c2e',
                  fontSize:   '14px',
                  fontStyle:  'italic',
                  margin:     0,
                  lineHeight: '1.8',
                }}
              >
                Generating...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Group Header ─────────────────────────────────────────────────────────────

function GroupHeader({ label }: { label: string }) {
  return (
    <div style={{ backgroundColor: '#6b2737', padding: '10px 20px' }}>
      <span
        style={{
          color:         '#f4f1e8',
          fontFamily:    'var(--font-raleway, sans-serif)',
          fontSize:      '10px',
          fontWeight:    700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChartDisplay({
  chart, chartJson, tier, mode, onModeChange,
}: ChartDisplayProps) {
  const [activeTab, setActiveTab] = useState<TabId>('d1')
  const [openRows,  setOpenRows]  = useState<Set<string>>(new Set())

  const astroGroups = getAstroGroups(mode)

  function toggleRow(key: string) {
    setOpenRows(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div
      style={{
        backgroundColor: '#0e0c0b',
        minHeight:       '100vh',
        display:         'flex',
        flexDirection:   'column',
      }}
    >
      <TabBar
        active={activeTab}
        tier={tier}
        onChange={setActiveTab}
        mode={mode}
        onModeChange={onModeChange}
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* D-1 Chart */}
        {activeTab === 'd1' && (
          <>
            <ChartWheelPlaceholder />
            <div>
              {astroGroups.map(group => (
                <div key={group.id}>
                  <GroupHeader label={group.header} />
                  {group.rows.map((row, rowIdx) => {
                    const rowKey  = `${group.id}-${rowIdx}`
                    const content = getContent(chart, row.column)
                    return (
                      <AccordionRow
                        key={rowKey}
                        rowKey={rowKey}
                        label={row.label}
                        content={content}
                        isOpen={openRows.has(rowKey)}
                        onToggle={() => toggleRow(rowKey)}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Nakshatra Chart */}
        {activeTab === 'nakshatra' && (
          <>
            <ChartWheelPlaceholder />
            <div
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                padding:        '60px 24px',
              }}
            >
              <p style={{ color: 'rgba(154,124,46,0.4)', fontFamily: 'Georgia, serif', fontSize: '14px', fontStyle: 'italic', margin: 0 }}>
                Nakshatra Chart — Coming Soon
              </p>
            </div>
          </>
        )}

        {/* Human Design */}
        {activeTab === 'hd' && (
          chartJson ? (
            <>
              <HDPanel chartJson={chartJson} />
              <HDInterpretationPanel
                chart={chart}
                openRows={openRows}
                onToggle={toggleRow}
                idPrefix="hd-interp"
              />
            </>
          ) : (
            <div
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                padding:        '60px 24px',
              }}
            >
              <p style={{ color: 'rgba(154,124,46,0.4)', fontFamily: 'Georgia, serif', fontSize: '14px', fontStyle: 'italic', margin: 0 }}>
                Human Design data unavailable
              </p>
            </div>
          )
        )}

        {/* D-Charts */}
        {activeTab === 'dcharts' && tier > 1 && (
          <>
            <ChartWheelPlaceholder />
            {DCHART_GROUPS.map(group => (
              <div key={group.id}>
                <GroupHeader label={group.header} />
                {group.rows.map((row, rowIdx) => {
                  const rowKey  = `dchart-${group.id}-${rowIdx}`
                  const content = getContent(chart, row.column)
                  return (
                    <AccordionRow
                      key={rowKey}
                      rowKey={rowKey}
                      label={row.label}
                      content={content}
                      isOpen={openRows.has(rowKey)}
                      onToggle={() => toggleRow(rowKey)}
                    />
                  )
                })}
              </div>
            ))}
          </>
        )}

      </div>
    </div>
  )
}
