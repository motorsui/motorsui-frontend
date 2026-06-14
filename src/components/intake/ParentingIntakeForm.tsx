'use client'

import { useState, useCallback } from 'react'
import {
  PARENTING_INTRO,
  PARENTING_PRODUCT_LINE,
  PARENTING_QUESTION_LIST,
  PARENTING_SECTIONS,
  PARENTING_CHILD_SECTION,
  type IntakeQuestion,
} from '@/lib/intake-questions'

// ── Module-level helpers ──────────────────────────────────────────────────────

const questionSectionMap: Record<string, string> = {}
PARENTING_SECTIONS.forEach(section => {
  section.questions.forEach(q => {
    questionSectionMap[q.id] = section.title
  })
})

const OPTIONAL_IDS = new Set(['p20', 'p26', 'p37', 'p50'])

function computeInitialStep(initialAnswers?: Record<string, string>): number {
  if (!initialAnswers) return -1
  const allQIds = PARENTING_QUESTION_LIST.map(q => q.id)
  const hasBirthData = (initialAnswers['c_name'] ?? '').trim() !== ''
  if (!hasBirthData) return -1
  const allAnswered = allQIds.every(id => OPTIONAL_IDS.has(id) || (initialAnswers[id] ?? '').trim() !== '')
  if (allAnswered) return 69
  const firstUnanswered = allQIds.findIndex(id => !OPTIONAL_IDS.has(id) && (initialAnswers[id] ?? '').trim() === '')
  return firstUnanswered === -1 ? 69 : firstUnanswered + 1
}

async function autosave(chartId: string, answers: Record<string, string>) {
  try {
    await fetch('/api/autosave-parenting-intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chartId, answers }),
    })
  } catch { /* silent */ }
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0e0c0b',
    padding: '0',
    position: 'relative' as const,
  } as React.CSSProperties,

  progressWrap: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    height: '3px',
    backgroundColor: 'rgba(154,124,46,0.15)',
  } as React.CSSProperties,

  progressFill: (pct: number) => ({
    height: '100%',
    width: `${pct}%`,
    backgroundColor: '#9a7c2e',
    transition: 'width 0.4s ease',
  } as React.CSSProperties),

  inner: {
    width: '100%',
    maxWidth: '680px',
    margin: '0 auto',
    padding: '60px 20px 80px',
  } as React.CSSProperties,

  eyebrow: {
    fontFamily: 'var(--font-raleway, sans-serif)',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: '#9a7c2e',
    marginBottom: '8px',
  } as React.CSSProperties,

  heading: {
    fontFamily: 'Georgia, serif',
    fontSize: 'clamp(22px, 5vw, 30px)',
    color: '#f4f1e8',
    lineHeight: 1.2,
    marginBottom: '8px',
    fontWeight: 400,
  } as React.CSSProperties,

  subtitle: {
    fontFamily: 'Georgia, serif',
    fontSize: '14px',
    color: 'rgba(244,241,232,0.55)',
    lineHeight: 1.6,
    marginBottom: '32px',
  } as React.CSSProperties,

  introPara: {
    fontFamily: 'Georgia, serif',
    fontSize: '15px',
    color: 'rgba(244,241,232,0.75)',
    lineHeight: 1.8,
    marginBottom: '40px',
  } as React.CSSProperties,

  tagLine: {
    fontFamily: 'var(--font-raleway, sans-serif)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: 'rgba(154,124,46,0.7)',
    marginBottom: '28px',
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,

  stepLabel: {
    fontFamily: 'var(--font-raleway, sans-serif)',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: 'rgba(154,124,46,0.6)',
    marginBottom: '20px',
  } as React.CSSProperties,

  sectionTitle: {
    fontFamily: 'var(--font-raleway, sans-serif)',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: 'rgba(154,124,46,0.5)',
    marginBottom: '20px',
  } as React.CSSProperties,

  questionText: {
    fontFamily: 'Georgia, serif',
    fontSize: 'clamp(17px, 3vw, 20px)',
    color: '#f4f1e8',
    lineHeight: 1.5,
    marginBottom: '28px',
    fontWeight: 400,
  } as React.CSSProperties,

  label: {
    display: 'block',
    fontFamily: 'var(--font-raleway, sans-serif)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: 'rgba(154,124,46,0.75)',
    marginBottom: '8px',
  } as React.CSSProperties,

  input: {
    width: '100%',
    backgroundColor: '#1a1410',
    border: '1px solid rgba(154,124,46,0.25)',
    borderRadius: '3px',
    padding: '11px 14px',
    color: '#f4f1e8',
    fontFamily: 'Georgia, serif',
    fontSize: '14px',
    outline: 'none',
    colorScheme: 'dark' as const,
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,

  textarea: {
    width: '100%',
    backgroundColor: '#1a1410',
    border: '1px solid rgba(154,124,46,0.25)',
    borderRadius: '3px',
    padding: '11px 14px',
    color: '#f4f1e8',
    fontFamily: 'Georgia, serif',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical' as const,
    minHeight: '120px',
    lineHeight: 1.6,
    colorScheme: 'dark' as const,
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,

  select: {
    width: '100%',
    backgroundColor: '#1a1410',
    border: '1px solid rgba(154,124,46,0.25)',
    borderRadius: '3px',
    padding: '11px 14px',
    color: '#f4f1e8',
    fontFamily: 'Georgia, serif',
    fontSize: '14px',
    outline: 'none',
    colorScheme: 'dark' as const,
    appearance: 'none' as const,
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,

  questionBlock: {
    marginBottom: '24px',
  } as React.CSSProperties,

  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '40px',
    gap: '12px',
  } as React.CSSProperties,

  btnPrimary: {
    backgroundColor: '#9a7c2e',
    color: '#0e0c0b',
    border: 'none',
    borderRadius: '3px',
    padding: '13px 28px',
    fontFamily: 'var(--font-raleway, sans-serif)',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
  } as React.CSSProperties,

  btnSecondary: {
    backgroundColor: 'transparent',
    color: 'rgba(154,124,46,0.7)',
    border: '1px solid rgba(154,124,46,0.3)',
    borderRadius: '3px',
    padding: '13px 28px',
    fontFamily: 'var(--font-raleway, sans-serif)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
  } as React.CSSProperties,

  error: {
    fontFamily: 'Georgia, serif',
    fontSize: '13px',
    color: '#c45a5a',
    fontStyle: 'italic',
    marginTop: '16px',
  } as React.CSSProperties,

  confirmIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: 'rgba(154,124,46,0.15)',
    border: '1px solid rgba(154,124,46,0.4)',
    marginBottom: '28px',
    fontSize: '24px',
    color: '#9a7c2e',
  } as React.CSSProperties,
}

// ── Birth data field renderer ─────────────────────────────────────────────────

function BirthField({
  question,
  value,
  onChange,
}: {
  question: IntakeQuestion
  value: string
  onChange: (v: string) => void
}) {
  if (question.type === 'select' && question.options) {
    return (
      <select
        style={S.select}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Select...</option>
        {question.options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    )
  }
  return (
    <input
      style={S.input}
      type={question.type === 'textarea' ? 'text' : question.type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={question.placeholder ?? ''}
    />
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ParentingIntakeFormProps {
  chartId: string
  initialAnswers?: Record<string, string>
  onComplete: (childChartId: string) => Promise<void>
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ParentingIntakeForm({ chartId, initialAnswers, onComplete }: ParentingIntakeFormProps) {
  const [step, setStep] = useState<number>(() => computeInitialStep(initialAnswers))
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers ?? {})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setAnswer = useCallback((id: string, value: string) => {
    setAnswers(prev => ({ ...prev, [id]: value }))
  }, [])

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  function validateBirthData(): string | null {
    const required = ['c_name', 'c_date', 'c_time', 'c_city', 'c_country']
    for (const id of required) {
      if (!(answers[id] ?? '').trim()) {
        const q = PARENTING_CHILD_SECTION.questions.find(q => q.id === id)
        return `"${q?.text ?? id}" is required.`
      }
    }
    return null
  }

  function validateQuestion(q: IntakeQuestion): string | null {
    if (!q.required) return null
    const val = (answers[q.id] ?? '').trim()
    if (!val) return 'Please answer this question before continuing.'
    return null
  }

  async function handleBirthNext() {
    const err = validateBirthData()
    if (err) { setError(err); return }
    setError(null)
    await autosave(chartId, answers)
    setStep(1)
    scrollTop()
  }

  async function handleQuestionNext(q: IntakeQuestion, isLast: boolean) {
    const err = validateQuestion(q)
    if (err) { setError(err); return }
    setError(null)
    await autosave(chartId, answers)
    if (isLast) {
      setSubmitting(true)
      try {
        const res = await fetch('/api/save-intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formType: 'parenting', chartId, answers }),
        })
        if (!res.ok) {
          const e = await res.json().catch(() => ({}))
          throw new Error((e as Record<string, string>).error ?? 'Submission failed')
        }
        const data = await res.json() as { child_chart_id?: string }
        const childChartId = data.child_chart_id ?? ''
        setStep(69)
        scrollTop()
        await onComplete(childChartId)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Submission failed. Please try again.')
      } finally {
        setSubmitting(false)
      }
    } else {
      setStep(s => s + 1)
      scrollTop()
    }
  }

  // ── Intro screen (step = -1) ───────────────────────────────────────────────

  if (step === -1) {
    return (
      <div style={S.page}>
        <div style={S.inner}>
          <p style={S.eyebrow}>MOTORSUI — PARENTING INTAKE FORM</p>
          <h1 style={S.heading}>Parenting Intake Form</h1>
          <p style={S.tagLine}>{PARENTING_PRODUCT_LINE}</p>
          <p style={{ ...S.subtitle, marginBottom: '24px' }}>Completed by the parent about the child</p>
          <p style={S.introPara}>{PARENTING_INTRO}</p>
          <button style={S.btnPrimary} onClick={() => { setStep(0); scrollTop() }}>
            Begin
          </button>
        </div>
      </div>
    )
  }

  // ── Birth data screen (step = 0) ───────────────────────────────────────────

  if (step === 0) {
    return (
      <div style={S.page}>
        <div style={S.inner}>
          <p style={S.eyebrow}>MOTORSUI</p>
          <h1 style={S.heading}>{PARENTING_CHILD_SECTION.title}</h1>
          {PARENTING_CHILD_SECTION.description && (
            <p style={S.subtitle}>{PARENTING_CHILD_SECTION.description}</p>
          )}
          <div style={{ marginTop: '32px' }}>
            {PARENTING_CHILD_SECTION.questions.map(q => (
              <div key={q.id} style={S.questionBlock}>
                <label style={S.label}>
                  {q.text}
                  {q.required && <span style={{ color: '#9a7c2e', marginLeft: '4px' }}>*</span>}
                </label>
                <BirthField question={q} value={answers[q.id] ?? ''} onChange={v => setAnswer(q.id, v)} />
              </div>
            ))}
          </div>
          {error && <p style={S.error}>{error}</p>}
          <div style={S.nav}>
            <button style={S.btnSecondary} onClick={() => { setError(null); setStep(-1); scrollTop() }}>
              Back
            </button>
            <button style={S.btnPrimary} onClick={handleBirthNext}>
              Continue
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Confirmation screen (step = 69) ───────────────────────────────────────

  if (step === 69) {
    return (
      <div style={S.page}>
        <div style={S.inner}>
          <div style={S.confirmIcon}>&#10003;</div>
          <p style={S.eyebrow}>MOTORSUI</p>
          <h1 style={S.heading}>Your intake is complete.</h1>
          <p style={S.subtitle}>Your reading is being generated.</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: 'rgba(244,241,232,0.5)', lineHeight: 1.6 }}>
            You can close this window or wait here while it prepares.
          </p>
        </div>
      </div>
    )
  }

  // ── Question screens (steps 1-68) ─────────────────────────────────────────

  const qIndex = step - 1
  const q = PARENTING_QUESTION_LIST[qIndex]
  const sectionTitle = questionSectionMap[q.id] ?? ''
  const isLast = step === 68
  const pct = Math.round((step / 68) * 100)

  return (
    <div style={S.page}>
      <div style={S.progressWrap}>
        <div style={S.progressFill(pct)} />
      </div>
      <div style={S.inner}>
        <p style={S.stepLabel}>Question {step} of 68</p>
        {sectionTitle && <p style={S.sectionTitle}>{sectionTitle}</p>}
        <p style={S.questionText}>{q.text}</p>
        <textarea
          style={S.textarea}
          value={answers[q.id] ?? ''}
          onChange={e => setAnswer(q.id, e.target.value)}
          rows={5}
        />
        {error && <p style={S.error}>{error}</p>}
        <div style={S.nav}>
          {step > 1 ? (
            <button
              style={S.btnSecondary}
              onClick={() => { setError(null); setStep(s => s - 1); scrollTop() }}
              disabled={submitting}
            >
              Previous
            </button>
          ) : (
            <button
              style={S.btnSecondary}
              onClick={() => { setError(null); setStep(0); scrollTop() }}
              disabled={submitting}
            >
              Previous
            </button>
          )}
          <button
            style={submitting ? { ...S.btnPrimary, opacity: 0.5, cursor: 'not-allowed' } : S.btnPrimary}
            onClick={() => handleQuestionNext(q, isLast)}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : isLast ? 'Submit' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
