'use client'

import { useState, useCallback } from 'react'
import {
  RELATIONAL_INTRO,
  RELATIONAL_PRODUCT_LINE,
  RELATIONAL_QUESTION_LIST,
  RELATIONAL_SECTIONS,
  RELATIONAL_PERSON_B_SECTION,
  type IntakeQuestion,
} from '@/lib/intake-questions'

// ── Module-level helpers ──────────────────────────────────────────────────────

const questionSectionMap: Record<string, string> = {}
RELATIONAL_SECTIONS.forEach(section => {
  section.questions.forEach(q => {
    questionSectionMap[q.id] = section.title
  })
})

function computeInitialStep(initialAnswers?: Record<string, string>): number {
  if (!initialAnswers) return -1
  const allQIds = RELATIONAL_QUESTION_LIST.map(q => q.id)
  const allAnswered = allQIds.every(id => (initialAnswers[id] ?? '').trim() !== '')
  if (allAnswered) return 43
  const hasBirthData = (initialAnswers['r_name'] ?? '').trim() !== ''
  if (hasBirthData) {
    const firstUnanswered = allQIds.findIndex(id => (initialAnswers[id] ?? '').trim() === '')
    return firstUnanswered === -1 ? 43 : firstUnanswered + 1
  }
  return -1
}

async function autosave(chartId: string, answers: Record<string, string>) {
  try {
    await fetch('/api/autosave-intake', {
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

  numberInput: {
    width: '120px',
    backgroundColor: '#1a1410',
    border: '1px solid rgba(154,124,46,0.25)',
    borderRadius: '3px',
    padding: '11px 14px',
    color: '#f4f1e8',
    fontFamily: 'Georgia, serif',
    fontSize: '18px',
    outline: 'none',
    colorScheme: 'dark' as const,
    boxSizing: 'border-box' as const,
    textAlign: 'center' as const,
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

  copyBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#1a1410',
    border: '1px solid rgba(154,124,46,0.25)',
    borderRadius: '3px',
    padding: '12px 16px',
    marginTop: '16px',
    marginBottom: '32px',
  } as React.CSSProperties,

  copyLink: {
    flex: 1,
    fontFamily: 'Georgia, serif',
    fontSize: '13px',
    color: 'rgba(244,241,232,0.65)',
    wordBreak: 'break-all' as const,
  } as React.CSSProperties,

  copyBtn: {
    backgroundColor: 'transparent',
    color: '#9a7c2e',
    border: '1px solid rgba(154,124,46,0.4)',
    borderRadius: '3px',
    padding: '6px 14px',
    fontFamily: 'var(--font-raleway, sans-serif)',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
}

// ── Question field renderer ───────────────────────────────────────────────────

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: IntakeQuestion
  value: string
  onChange: (v: string) => void
}) {
  if (question.type === 'number') {
    return (
      <input
        type="number"
        min={1}
        max={10}
        style={S.numberInput}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="1-10"
      />
    )
  }
  if (question.type === 'textarea') {
    return (
      <textarea
        style={S.textarea}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={question.placeholder ?? ''}
        rows={5}
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
      type={question.type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={question.placeholder ?? ''}
    />
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface RelationalIntakeFormProps {
  chartId: string
  initialAnswers?: Record<string, string>
  onComplete: (partnerChartId: string) => Promise<void>
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RelationalIntakeForm({ chartId, initialAnswers, onComplete }: RelationalIntakeFormProps) {
  const [step, setStep] = useState<number>(() => computeInitialStep(initialAnswers))
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers ?? {})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [partnerLink, setPartnerLink] = useState('')

  const setAnswer = useCallback((id: string, value: string) => {
    setAnswers(prev => ({ ...prev, [id]: value }))
  }, [])

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  function validateBirthData(): string | null {
    const required = ['r_name', 'r_date', 'r_time', 'r_city', 'r_country']
    for (const id of required) {
      if (!(answers[id] ?? '').trim()) {
        const q = RELATIONAL_PERSON_B_SECTION.questions.find(q => q.id === id)
        return `"${q?.text ?? id}" is required.`
      }
    }
    return null
  }

  function validateQuestion(q: IntakeQuestion): string | null {
    if (!q.required) return null
    const val = (answers[q.id] ?? '').trim()
    if (!val) return 'Please answer this question before continuing.'
    if (q.type === 'number') {
      const n = Number(val)
      if (isNaN(n) || n < 1 || n > 10) return 'Please enter a number between 1 and 10.'
    }
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
          body: JSON.stringify({ formType: 'relational', chartId, answers }),
        })
        if (!res.ok) {
          const e = await res.json().catch(() => ({}))
          throw new Error((e as Record<string, string>).error ?? 'Submission failed')
        }
        const data = await res.json() as { partner_chart_id?: string }
        const pid = data.partner_chart_id ?? ''
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        setPartnerLink(`${origin}/intake/partner?id=${pid}`)
        setStep(43)
        scrollTop()
        await onComplete(pid)
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
          <p style={S.eyebrow}>MOTORSUI</p>
          <h1 style={S.heading}>Relational Intake Form</h1>
          <p style={S.subtitle}>{RELATIONAL_PRODUCT_LINE}</p>
          <p style={S.introPara}>{RELATIONAL_INTRO}</p>
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
          <h1 style={S.heading}>{RELATIONAL_PERSON_B_SECTION.title}</h1>
          {RELATIONAL_PERSON_B_SECTION.description && (
            <p style={S.subtitle}>{RELATIONAL_PERSON_B_SECTION.description}</p>
          )}
          <div style={{ marginTop: '32px' }}>
            {RELATIONAL_PERSON_B_SECTION.questions.map(q => (
              <div key={q.id} style={S.questionBlock}>
                <label style={S.label}>
                  {q.text}
                  {q.required && <span style={{ color: '#9a7c2e', marginLeft: '4px' }}>*</span>}
                </label>
                <QuestionField question={q} value={answers[q.id] ?? ''} onChange={v => setAnswer(q.id, v)} />
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

  // ── Confirmation screen (step = 43) ───────────────────────────────────────

  if (step === 43) {
    return (
      <div style={S.page}>
        <div style={S.inner}>
          <p style={S.eyebrow}>MOTORSUI</p>
          <h1 style={S.heading}>Your intake is complete.</h1>
          <p style={S.subtitle}>
            Share the link below with your partner so they can complete their intake. The reading generates after both forms are submitted.
          </p>
          {partnerLink && (
            <>
              <p style={{ ...S.label, marginBottom: '8px' }}>Partner link</p>
              <div style={S.copyBox}>
                <span style={S.copyLink}>{partnerLink}</span>
                <button
                  style={S.copyBtn}
                  onClick={() => {
                    navigator.clipboard.writeText(partnerLink).then(() => {
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    })
                  }}
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </>
          )}
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: 'rgba(244,241,232,0.5)', lineHeight: 1.6 }}>
            Your reading will appear on this page once your partner has also submitted their intake.
          </p>
        </div>
      </div>
    )
  }

  // ── Question screens (steps 1-42) ─────────────────────────────────────────

  const qIndex = step - 1
  const q = RELATIONAL_QUESTION_LIST[qIndex]
  const sectionTitle = questionSectionMap[q.id] ?? ''
  const isLast = step === 42
  const pct = Math.round((step / 42) * 100)

  return (
    <div style={S.page}>
      <div style={S.progressWrap}>
        <div style={S.progressFill(pct)} />
      </div>
      <div style={S.inner}>
        <p style={S.stepLabel}>Question {step} of 42</p>
        {sectionTitle && <p style={S.sectionTitle}>{sectionTitle}</p>}
        <p style={S.questionText}>{q.text}</p>
        <QuestionField question={q} value={answers[q.id] ?? ''} onChange={v => setAnswer(q.id, v)} />
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
