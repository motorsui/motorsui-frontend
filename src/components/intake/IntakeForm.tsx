'use client'

import { useState, useCallback } from 'react'
import {
  getSections,
  getIntakeTitle,
  getIntakeSubtitle,
  type IntakeType,
  type IntakeSection,
  type IntakeQuestion,
} from '@/lib/intake-questions'

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight:       '100vh',
    backgroundColor: '#0e0c0b',
    padding:         '40px 20px 80px',
  } as React.CSSProperties,

  inner: {
    width:   '100%',
    maxWidth:'680px',
    margin:  '0 auto',
  } as React.CSSProperties,

  eyebrow: {
    fontFamily:    'var(--font-raleway, sans-serif)',
    fontSize:      '10px',
    fontWeight:    700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color:         '#9a7c2e',
    marginBottom:  '8px',
  } as React.CSSProperties,

  heading: {
    fontFamily:   'Georgia, serif',
    fontSize:     'clamp(24px, 5vw, 32px)',
    color:        '#f4f1e8',
    lineHeight:   1.2,
    marginBottom: '8px',
  } as React.CSSProperties,

  subtitle: {
    fontFamily:   'Georgia, serif',
    fontSize:     '15px',
    color:        'rgba(244,241,232,0.55)',
    lineHeight:   1.6,
    marginBottom: '32px',
  } as React.CSSProperties,

  progressBar: {
    width:        '100%',
    height:       '2px',
    background:   'rgba(154,124,46,0.15)',
    borderRadius: '1px',
    marginBottom: '32px',
    overflow:     'hidden',
  } as React.CSSProperties,

  progressFill: (pct: number) => ({
    height:          '100%',
    width:           `${pct}%`,
    backgroundColor: '#9a7c2e',
    borderRadius:    '1px',
    transition:      'width 0.4s ease',
  } as React.CSSProperties),

  stepLabel: {
    fontFamily:    'var(--font-raleway, sans-serif)',
    fontSize:      '10px',
    fontWeight:    600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color:         'rgba(154,124,46,0.6)',
    marginBottom:  '20px',
  } as React.CSSProperties,

  sectionTitle: {
    fontFamily:   'Georgia, serif',
    fontSize:     '20px',
    color:        '#f4f1e8',
    marginBottom: '6px',
  } as React.CSSProperties,

  sectionDesc: {
    fontFamily:   'Georgia, serif',
    fontSize:     '14px',
    color:        'rgba(244,241,232,0.5)',
    marginBottom: '28px',
    lineHeight:   1.6,
  } as React.CSSProperties,

  questionBlock: {
    marginBottom: '24px',
  } as React.CSSProperties,

  label: {
    display:       'block',
    fontFamily:    'var(--font-raleway, sans-serif)',
    fontSize:      '11px',
    fontWeight:    600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color:         'rgba(154,124,46,0.75)',
    marginBottom:  '8px',
  } as React.CSSProperties,

  input: {
    width:           '100%',
    backgroundColor: '#1a1410',
    border:          '1px solid rgba(154,124,46,0.25)',
    borderRadius:    '3px',
    padding:         '11px 14px',
    color:           '#f4f1e8',
    fontFamily:      'Georgia, serif',
    fontSize:        '14px',
    outline:         'none',
    colorScheme:     'dark' as const,
    boxSizing:       'border-box' as const,
  } as React.CSSProperties,

  textarea: {
    width:           '100%',
    backgroundColor: '#1a1410',
    border:          '1px solid rgba(154,124,46,0.25)',
    borderRadius:    '3px',
    padding:         '11px 14px',
    color:           '#f4f1e8',
    fontFamily:      'Georgia, serif',
    fontSize:        '14px',
    outline:         'none',
    resize:          'vertical' as const,
    minHeight:       '90px',
    lineHeight:      1.6,
    colorScheme:     'dark' as const,
    boxSizing:       'border-box' as const,
  } as React.CSSProperties,

  select: {
    width:           '100%',
    backgroundColor: '#1a1410',
    border:          '1px solid rgba(154,124,46,0.25)',
    borderRadius:    '3px',
    padding:         '11px 14px',
    color:           '#f4f1e8',
    fontFamily:      'Georgia, serif',
    fontSize:        '14px',
    outline:         'none',
    colorScheme:     'dark' as const,
    appearance:      'none' as const,
    boxSizing:       'border-box' as const,
  } as React.CSSProperties,

  nav: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginTop:      '40px',
    gap:            '12px',
  } as React.CSSProperties,

  btnPrimary: {
    backgroundColor: '#9a7c2e',
    color:           '#0e0c0b',
    border:          'none',
    borderRadius:    '3px',
    padding:         '13px 28px',
    fontFamily:      'var(--font-raleway, sans-serif)',
    fontSize:        '11px',
    fontWeight:      700,
    letterSpacing:   '0.14em',
    textTransform:   'uppercase' as const,
    cursor:          'pointer',
  } as React.CSSProperties,

  btnSecondary: {
    backgroundColor: 'transparent',
    color:           'rgba(154,124,46,0.7)',
    border:          '1px solid rgba(154,124,46,0.3)',
    borderRadius:    '3px',
    padding:         '13px 28px',
    fontFamily:      'var(--font-raleway, sans-serif)',
    fontSize:        '11px',
    fontWeight:      600,
    letterSpacing:   '0.14em',
    textTransform:   'uppercase' as const,
    cursor:          'pointer',
  } as React.CSSProperties,

  error: {
    fontFamily:  'Georgia, serif',
    fontSize:    '13px',
    color:       '#c45a5a',
    fontStyle:   'italic',
    marginTop:   '8px',
  } as React.CSSProperties,

  divider: {
    border:      'none',
    borderTop:   '1px solid rgba(154,124,46,0.12)',
    margin:      '32px 0',
  } as React.CSSProperties,
}

// ─── Field renderer ───────────────────────────────────────────────────────────

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: IntakeQuestion
  value:    string
  onChange: (v: string) => void
}) {
  if (question.type === 'textarea') {
    return (
      <textarea
        style={S.textarea}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={question.placeholder ?? ''}
        rows={4}
      />
    )
  }

  if (question.type === 'select' && question.options) {
    return (
      <select
        style={S.select}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Select…</option>
        {question.options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    )
  }

  return (
    <input
      style={S.input}
      type={question.type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={question.placeholder ?? ''}
    />
  )
}

// ─── Section renderer ─────────────────────────────────────────────────────────

function SectionView({
  section,
  answers,
  onChange,
}: {
  section:  IntakeSection
  answers:  Record<string, string>
  onChange: (id: string, value: string) => void
}) {
  return (
    <div>
      <h2 style={S.sectionTitle}>{section.title}</h2>
      {section.description && (
        <p style={S.sectionDesc}>{section.description}</p>
      )}
      {!section.description && <div style={{ marginBottom: '24px' }} />}
      {section.questions.map(q => (
        <div key={q.id} style={S.questionBlock}>
          <label style={S.label}>
            {q.text}
            {q.required && <span style={{ color: '#9a7c2e', marginLeft: '4px' }}>*</span>}
          </label>
          <QuestionField
            question={q}
            value={answers[q.id] ?? ''}
            onChange={v => onChange(q.id, v)}
          />
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface IntakeFormProps {
  formType:   IntakeType
  chartId:    string
  onComplete: (answers: Record<string, string>) => Promise<void>
}

export default function IntakeForm({ formType, chartId, onComplete }: IntakeFormProps) {
  const sections = getSections(formType)
  const title    = getIntakeTitle(formType)
  const subtitle = getIntakeSubtitle(formType)

  const [step,       setStep]       = useState(0)
  const [answers,    setAnswers]    = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const section = sections[step]
  const total   = sections.length
  const pct     = Math.round(((step + 1) / total) * 100)
  const isLast  = step === total - 1

  const setAnswer = useCallback((id: string, value: string) => {
    setAnswers(prev => ({ ...prev, [id]: value }))
  }, [])

  function validateStep(): string | null {
    for (const q of section.questions) {
      if (q.required && !answers[q.id]?.trim()) {
        return `"${q.text}" is required.`
      }
    }
    return null
  }

  function handleNext() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError(null)
    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError(null)
    setSubmitting(true)

    try {
      await onComplete(answers)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div style={S.page}>
      <div style={S.inner}>

        <p style={S.eyebrow}>MotorSui</p>
        <h1 style={S.heading}>{title}</h1>
        <p style={S.subtitle}>{subtitle}</p>

        <div style={S.progressBar}>
          <div style={S.progressFill(pct)} />
        </div>

        <p style={S.stepLabel}>
          Section {step + 1} of {total}
        </p>

        <SectionView
          section={section}
          answers={answers}
          onChange={setAnswer}
        />

        {error && <p style={S.error}>{error}</p>}

        <div style={S.nav}>
          {step > 0 ? (
            <button
              style={S.btnSecondary}
              onClick={() => { setError(null); setStep(s => s - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              disabled={submitting}
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {isLast ? (
            <button
              style={submitting ? { ...S.btnPrimary, opacity: 0.5, cursor: 'not-allowed' } : S.btnPrimary}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit Intake'}
            </button>
          ) : (
            <button style={S.btnPrimary} onClick={handleNext}>
              Next
            </button>
          )}
        </div>

        <hr style={S.divider} />
        <p style={{ ...S.stepLabel, textAlign: 'center', opacity: 0.5 }}>
          Your answers are saved when you submit. You can go back to any section before submitting.
        </p>
      </div>
    </div>
  )
}
