'use client'

import { useState, useCallback } from 'react'
import {
  SELF_QUESTION_LIST,
  SELF_SECTIONS,
} from '@/lib/intake-questions'

const TOTAL = SELF_QUESTION_LIST.length

// Build section title lookup by question ID
const questionSectionMap: Record<string, string> = {}
for (const section of SELF_SECTIONS) {
  for (const q of section.questions) {
    questionSectionMap[q.id] = section.title
  }
}

function resumeStep(initialAnswers: Record<string, string> | undefined): number {
  if (!initialAnswers || Object.keys(initialAnswers).length === 0) return -1
  for (let i = 0; i < TOTAL; i++) {
    const id = SELF_QUESTION_LIST[i].id
    if ((initialAnswers[id] ?? '').trim() === '') return i + 1
  }
  return TOTAL + 1
}

async function autosave(chartId: string, answers: Record<string, string>) {
  try {
    await fetch('/api/autosave-self-intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chartId, answers }),
    })
  } catch { /* silent */ }
}

interface SelfIntakeFormProps {
  chartId: string
  initialAnswers?: Record<string, string>
  onComplete: () => Promise<void>
}

const S = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0e0c0b',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  progressWrap: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    height: '3px',
    backgroundColor: 'rgba(154,124,46,0.15)',
    zIndex: 50,
  },
  progressFill: (pct: number) => ({
    height: '100%',
    width: `${pct}%`,
    backgroundColor: '#9a7c2e',
    transition: 'width 0.35s ease',
  }),
  inner: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px 40px',
    maxWidth: '680px',
    margin: '0 auto',
    width: '100%',
  },
  eyebrow: {
    fontFamily: 'var(--font-raleway, sans-serif)',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.18em',
    color: '#9a7c2e',
    textTransform: 'uppercase' as const,
    marginBottom: '16px',
    textAlign: 'center' as const,
  },
  title: {
    fontFamily: 'var(--font-playfair, serif)',
    fontSize: '28px',
    fontWeight: 400,
    color: '#f4f1e8',
    lineHeight: '1.35',
    marginBottom: '12px',
    textAlign: 'center' as const,
  },
  subtitle: {
    fontFamily: 'var(--font-raleway, sans-serif)',
    fontSize: '12px',
    fontWeight: 500,
    letterSpacing: '0.08em',
    color: 'rgba(244,241,232,0.5)',
    marginBottom: '40px',
    textAlign: 'center' as const,
  },
  introParagraph: {
    fontFamily: 'var(--font-cormorant, serif)',
    fontSize: '17px',
    lineHeight: '1.8',
    color: 'rgba(244,241,232,0.8)',
    marginBottom: '48px',
    textAlign: 'left' as const,
    maxWidth: '600px',
  },
  btn: {
    display: 'inline-block',
    fontFamily: 'var(--font-raleway, sans-serif)',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    color: '#0e0c0b',
    backgroundColor: '#9a7c2e',
    border: 'none',
    padding: '14px 36px',
    cursor: 'pointer',
    borderRadius: '2px',
  },
  btnOutline: {
    display: 'inline-block',
    fontFamily: 'var(--font-raleway, sans-serif)',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    color: 'rgba(244,241,232,0.5)',
    backgroundColor: 'transparent',
    border: '1px solid rgba(244,241,232,0.15)',
    padding: '14px 36px',
    cursor: 'pointer',
    borderRadius: '2px',
    marginRight: '12px',
  },
  stepLabel: {
    fontFamily: 'var(--font-raleway, sans-serif)',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.14em',
    color: 'rgba(154,124,46,0.6)',
    textTransform: 'uppercase' as const,
    marginBottom: '12px',
    alignSelf: 'flex-start' as const,
  },
  sectionTitle: {
    fontFamily: 'var(--font-raleway, sans-serif)',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.16em',
    color: 'rgba(154,124,46,0.45)',
    textTransform: 'uppercase' as const,
    marginBottom: '20px',
    alignSelf: 'flex-start' as const,
  },
  questionText: {
    fontFamily: 'var(--font-cormorant, serif)',
    fontSize: '22px',
    fontWeight: 400,
    lineHeight: '1.5',
    color: '#f4f1e8',
    marginBottom: '28px',
    alignSelf: 'flex-start' as const,
  },
  textarea: {
    width: '100%',
    minHeight: '160px',
    backgroundColor: 'rgba(244,241,232,0.04)',
    border: '1px solid rgba(154,124,46,0.2)',
    borderRadius: '2px',
    padding: '16px',
    fontFamily: 'var(--font-cormorant, serif)',
    fontSize: '17px',
    lineHeight: '1.7',
    color: '#f4f1e8',
    resize: 'vertical' as const,
    outline: 'none',
    boxSizing: 'border-box' as const,
    marginBottom: '8px',
  },
  validationMsg: {
    fontFamily: 'var(--font-raleway, sans-serif)',
    fontSize: '11px',
    color: 'rgba(201,168,76,0.7)',
    marginBottom: '20px',
    alignSelf: 'flex-start' as const,
    minHeight: '16px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    alignSelf: 'flex-start' as const,
    marginTop: '4px',
  },
  confirmCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: 'rgba(154,124,46,0.15)',
    border: '1px solid rgba(154,124,46,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '28px',
    fontSize: '22px',
    color: '#9a7c2e',
  },
  confirmTitle: {
    fontFamily: 'var(--font-playfair, serif)',
    fontSize: '24px',
    fontWeight: 400,
    color: '#f4f1e8',
    marginBottom: '16px',
    textAlign: 'center' as const,
  },
  confirmBody: {
    fontFamily: 'var(--font-cormorant, serif)',
    fontSize: '17px',
    lineHeight: '1.75',
    color: 'rgba(244,241,232,0.65)',
    textAlign: 'center' as const,
    maxWidth: '480px',
  },
}

export default function SelfIntakeForm({ chartId, initialAnswers, onComplete }: SelfIntakeFormProps) {
  const [step, setStep]           = useState(() => resumeStep(initialAnswers))
  const [answers, setAnswers]     = useState<Record<string, string>>(initialAnswers ?? {})
  const [validation, setValidation] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const setAnswer = useCallback((id: string, value: string) => {
    setAnswers(prev => ({ ...prev, [id]: value }))
    if (validation) setValidation('')
  }, [validation])

  // ── Intro screen ──────────────────────────────────────────────────────────

  if (step === -1) {
    return (
      <div style={S.page}>
        <div style={S.inner}>
          <p style={S.eyebrow}>MotorSui — Self Intake Form</p>
          <h1 style={S.title}>Sidereal Astrology · Human Design</h1>
          <p style={S.subtitle}>Completed by you, about you</p>
          <p style={S.introParagraph}>
            The accuracy and depth of your reading depends on what you share here. Your chart shows
            the structural conditions you were born into and the energetic architecture that defines
            how you move through the world. What the chart cannot show is how those conditions have
            actually landed in your lived experience. The more precisely you describe your real life,
            not the composed version, not the one you present to others, but the one you actually
            inhabit, the more the reading can identify where your design is expressing cleanly, where
            it is being blocked, where friction is structural rather than personal, and where genuine
            potential has not yet met the right conditions. Answer honestly and specifically.
          </p>
          <button style={S.btn} onClick={() => setStep(1)}>Begin</button>
        </div>
      </div>
    )
  }

  // ── Confirmation screen ───────────────────────────────────────────────────

  if (step === TOTAL + 1) {
    return (
      <div style={S.page}>
        <div style={{ ...S.inner, alignItems: 'center' as const }}>
          <div style={S.confirmCircle}>✓</div>
          <p style={S.confirmTitle}>Your intake is complete.</p>
          <p style={S.confirmBody}>
            Your reading is being generated. You can close this window or wait here while it prepares.
          </p>
        </div>
      </div>
    )
  }

  // ── Question screens (steps 1-38) ─────────────────────────────────────────

  const qIndex = step - 1
  const q = SELF_QUESTION_LIST[qIndex]
  const sectionTitle = questionSectionMap[q.id] ?? ''
  const isLast = step === TOTAL
  const pct = Math.round((step / TOTAL) * 100)

  const handleAdvance = async () => {
    const val = (answers[q.id] ?? '').trim()
    if (q.required && !val) {
      setValidation('Please answer this question before continuing.')
      return
    }
    setValidation('')

    const updatedAnswers = { ...answers }

    if (isLast) {
      setSubmitting(true)
      try {
        const res = await fetch('/api/save-intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formType: 'self', chartId, answers: updatedAnswers }),
        })
        if (!res.ok) {
          const e = await res.json().catch(() => ({})) as Record<string, string>
          setValidation(e.error ?? 'Something went wrong. Please try again.')
          setSubmitting(false)
          return
        }
        setStep(TOTAL + 1)
        await onComplete()
      } catch {
        setValidation('Something went wrong. Please try again.')
        setSubmitting(false)
      }
      return
    }

    await autosave(chartId, updatedAnswers)
    setStep(s => s + 1)
  }

  return (
    <div style={S.page}>
      <div style={S.progressWrap}>
        <div style={S.progressFill(pct)} />
      </div>
      <div style={S.inner}>
        <p style={S.stepLabel}>Question {step} of {TOTAL}</p>
        {sectionTitle && <p style={S.sectionTitle}>{sectionTitle}</p>}
        <p style={S.questionText}>{q.text}</p>
        <textarea
          style={S.textarea}
          value={answers[q.id] ?? ''}
          onChange={e => setAnswer(q.id, e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdvance() }}
          autoFocus
        />
        <p style={S.validationMsg}>{validation}</p>
        <div style={S.row}>
          {step > 1 && (
            <button style={S.btnOutline} onClick={() => { setValidation(''); setStep(s => s - 1) }}>
              Back
            </button>
          )}
          <button style={S.btn} onClick={handleAdvance} disabled={submitting}>
            {submitting ? 'Submitting…' : isLast ? 'Submit' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
