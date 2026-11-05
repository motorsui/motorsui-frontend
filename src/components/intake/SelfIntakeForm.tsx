'use client'

import { useState, useCallback } from 'react'
import {
  SELF_QUESTION_LIST,
  SELF_SECTIONS,
  SELF_INTRO,
  SELF_QUESTIONNAIRE_VERSION,
  PREFER_NOT_TO_DISCLOSE,
  firstUnansweredSelfIndex,
  isSelfQuestionAnswered,
  joinMulti,
  selfIntakeVersion,
  splitMulti,
  type IntakeQuestion,
} from '@/lib/intake-questions'

const TOTAL        = SELF_QUESTION_LIST.length
const CONFIRM_STEP = TOTAL + 1
const LEGACY_STEP  = -2

// Build section title lookup by question ID
const questionSectionMap: Record<string, string> = {}
for (const section of SELF_SECTIONS) {
  for (const q of section.questions) {
    questionSectionMap[q.id] = section.title
  }
}

function resumeStep(initialAnswers: Record<string, string> | undefined): number {
  // Answers begun on an earlier version are kept as they are, never carried into v2 wording.
  const version = selfIntakeVersion(initialAnswers)
  if (!version) return -1
  if (version !== SELF_QUESTIONNAIRE_VERSION) return LEGACY_STEP
  const firstUnanswered = firstUnansweredSelfIndex(initialAnswers ?? {})
  // Fully answered but not yet submitted: reopen on the last question so Submit is reachable.
  return firstUnanswered === -1 ? TOTAL : firstUnanswered + 1
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
  input: {
    width: '100%',
    backgroundColor: 'rgba(244,241,232,0.04)',
    border: '1px solid rgba(154,124,46,0.2)',
    borderRadius: '2px',
    padding: '12px 16px',
    fontFamily: 'var(--font-cormorant, serif)',
    fontSize: '17px',
    color: '#f4f1e8',
    outline: 'none',
    boxSizing: 'border-box' as const,
    marginBottom: '8px',
  },
  option: {
    color: '#0e0c0b',
  },
  choices: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '10px',
    alignSelf: 'flex-start' as const,
    marginBottom: '8px',
  },
  choice: (on: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: 'var(--font-raleway, sans-serif)',
    fontSize: '12px',
    letterSpacing: '0.06em',
    textTransform: 'capitalize' as const,
    color: on ? '#0e0c0b' : 'rgba(244,241,232,0.75)',
    backgroundColor: on ? '#9a7c2e' : 'transparent',
    border: '1px solid rgba(154,124,46,0.35)',
    borderRadius: '2px',
    padding: '10px 14px',
    cursor: 'pointer',
  }),
  note: {
    fontFamily: 'var(--font-cormorant, serif)',
    fontSize: '16px',
    fontStyle: 'italic' as const,
    lineHeight: '1.6',
    color: 'rgba(244,241,232,0.6)',
    marginTop: '-12px',
    marginBottom: '24px',
    alignSelf: 'flex-start' as const,
  },
  detailLabel: {
    fontFamily: 'var(--font-cormorant, serif)',
    fontSize: '19px',
    lineHeight: '1.5',
    color: 'rgba(244,241,232,0.85)',
    margin: '20px 0 12px',
    alignSelf: 'flex-start' as const,
    display: 'block',
  },
  decline: (on: boolean) => ({
    fontFamily: 'var(--font-raleway, sans-serif)',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    color: on ? '#9a7c2e' : 'rgba(244,241,232,0.45)',
    backgroundColor: 'transparent',
    border: 'none',
    padding: '4px 0',
    cursor: 'pointer',
    alignSelf: 'flex-start' as const,
    marginBottom: '8px',
  }),
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

// ── Question field renderer ───────────────────────────────────────────────────

function AnswerField({
  question,
  value,
  onChange,
  onSubmitKey,
  autoFocus = true,
}: {
  question: IntakeQuestion
  value: string
  onChange: (v: string) => void
  onSubmitKey?: () => void
  autoFocus?: boolean
}) {
  if (question.type === 'select' && question.options) {
    return (
      <select style={S.input} value={value} onChange={e => onChange(e.target.value)} aria-label={question.text}>
        <option value="" style={S.option}>Select…</option>
        {question.options.map(o => <option key={o} value={o} style={S.option}>{o}</option>)}
      </select>
    )
  }
  if (question.type === 'multiselect' && question.options) {
    const selected = splitMulti(value)
    return (
      <div style={S.choices} role="group" aria-label={question.text}>
        {question.options.map(o => {
          const on = selected.includes(o)
          return (
            <label key={o} style={S.choice(on)}>
              <input
                type="checkbox"
                checked={on}
                onChange={() => onChange(joinMulti(question, on ? selected.filter(v => v !== o) : [...selected, o]))}
              />
              {o}
            </label>
          )
        })}
      </div>
    )
  }
  if (question.type === 'text') {
    // Selection or written answer: the list suggests, any typed answer is accepted.
    const listId = question.options ? `${question.id}-options` : undefined
    return (
      <>
        <input
          style={S.input}
          value={value}
          list={listId}
          onChange={e => onChange(e.target.value)}
          aria-label={question.text}
          autoFocus={autoFocus}
        />
        {listId && <datalist id={listId}>{question.options!.map(o => <option key={o} value={o} />)}</datalist>}
      </>
    )
  }
  return (
    <textarea
      style={S.textarea}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmitKey?.() }}
      aria-label={question.text}
      autoFocus={autoFocus}
    />
  )
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

  // ── Earlier-version intake ────────────────────────────────────────────────

  if (step === LEGACY_STEP) {
    return (
      <div style={S.page}>
        <div style={S.inner}>
          <p style={S.eyebrow}>MotorSui</p>
          <h1 style={S.title}>This intake was started on an earlier version of the questionnaire.</h1>
          <p style={S.subtitle}>Your earlier answers are saved and unchanged. Please contact MotorSui to continue.</p>
        </div>
      </div>
    )
  }

  // ── Intro screen ──────────────────────────────────────────────────────────

  if (step === -1) {
    return (
      <div style={S.page}>
        <div style={S.inner}>
          <p style={S.eyebrow}>MotorSui — Self Intake Form</p>
          <h1 style={S.title}>Sidereal Astrology · Human Design</h1>
          <p style={S.subtitle}>Completed by you, about you</p>
          {SELF_INTRO.map((para, i) => (
            <p key={i} style={{ ...S.introParagraph, marginBottom: i === SELF_INTRO.length - 1 ? '48px' : '20px' }}>{para}</p>
          ))}
          <button style={S.btn} onClick={() => setStep(1)}>Begin</button>
        </div>
      </div>
    )
  }

  // ── Confirmation screen ───────────────────────────────────────────────────

  if (step === CONFIRM_STEP) {
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

  // ── Question screens (steps 1-TOTAL) ──────────────────────────────────────

  const qIndex = step - 1
  const q = SELF_QUESTION_LIST[qIndex]
  const sectionTitle = questionSectionMap[q.id] ?? ''
  const isLast = step === TOTAL
  const pct = Math.round((step / TOTAL) * 100)

  const handleAdvance = async () => {
    if (!isSelfQuestionAnswered(q, answers)) {
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
        setStep(CONFIRM_STEP)
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
        {q.note && <p style={S.note}>{q.note}</p>}
        <AnswerField key={q.id} question={q} value={answers[q.id] ?? ''} onChange={v => setAnswer(q.id, v)} onSubmitKey={handleAdvance} />
        {q.allowDecline && (
          <button
            type="button"
            style={S.decline(answers[q.id] === PREFER_NOT_TO_DISCLOSE)}
            aria-pressed={answers[q.id] === PREFER_NOT_TO_DISCLOSE}
            onClick={() => setAnswer(q.id, answers[q.id] === PREFER_NOT_TO_DISCLOSE ? '' : PREFER_NOT_TO_DISCLOSE)}
          >
            {PREFER_NOT_TO_DISCLOSE}
          </button>
        )}
        {q.detail && (
          <>
            <label style={S.detailLabel}>{q.detail.text}</label>
            <AnswerField key={q.detail.id} question={q.detail} value={answers[q.detail.id] ?? ''} onChange={v => setAnswer(q.detail!.id, v)} autoFocus={false} />
          </>
        )}
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
