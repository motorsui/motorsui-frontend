'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  RELATIONAL_INDEPENDENT_COMPLETION,
  RELATIONAL_INTRO,
  RELATIONAL_QUESTION_LIST,
  firstUnansweredRelationalIndex,
  RELATIONAL_SECTIONS,
  type IntakeQuestion,
} from '@/lib/intake-questions'
import { createClient } from '@/lib/supabase/client'

// ─── Section map ──────────────────────────────────────────────────────────────

const questionSectionMap: Record<string, string> = {}
RELATIONAL_SECTIONS.forEach(section => {
  section.questions.forEach(q => {
    questionSectionMap[q.id] = section.title
  })
})

// ─── Session and autosave ─────────────────────────────────────────────────────

// Partner B arrives from the sign-in link that Supabase Auth mailed to the
// invited address. The link returns here with the session in the URL fragment;
// it is stored in this browser's auth cookies and removed from the address bar.
// The server checks that the session came from that email link and that its
// address matches an active invitation (see lib/partner-access.ts).

const SIGN_IN_PROBLEM: Record<string, string> = {
  otp_expired: 'This sign-in link has expired or has already been used. Request a new one below.',
}

async function adoptLinkSession(): Promise<string | null> {
  if (typeof window === 'undefined' || !window.location.hash) return null
  const params = new URLSearchParams(window.location.hash.slice(1))
  window.history.replaceState(null, '', window.location.pathname)
  const errorCode = params.get('error_code') ?? params.get('error')
  if (errorCode) return SIGN_IN_PROBLEM[errorCode] ?? 'This sign-in link could not be used. Request a new one below.'
  const access_token  = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  if (!access_token || !refresh_token) return null
  const { error } = await createClient().auth.setSession({ access_token, refresh_token })
  return error ? 'This sign-in link could not be used. Request a new one below.' : null
}

type SessionResult =
  | { kind: 'ready'; invitationId: string; answers: Record<string, string> }
  | { kind: 'complete' }
  | { kind: 'choose'; invitations: { invitation_id: string; created_at: string }[] }
  | { kind: 'signin'; message: string }
  | { kind: 'blocked'; message: string }

const LOAD_FAILED = 'Your intake could not be loaded. Please reload the page.'

async function partnerSession(invitationId?: string): Promise<SessionResult> {
  try {
    const res  = await fetch('/api/partner-intake/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invitationId ? { invitation_id: invitationId } : {}),
    })
    const data = await res.json().catch(() => ({})) as {
      invitation_id?: string; complete?: boolean; earlier_version?: boolean
      answers?: Record<string, string>; choose?: { invitation_id: string; created_at: string }[]
      code?: string; error?: string
    }
    if (res.status === 401) return { kind: 'signin', message: 'Enter the email address your partner invited to receive a sign-in link.' }
    if (res.status === 403 && data.code === 'no_invitation') {
      return { kind: 'signin', message: 'There is no active questionnaire for the email address you signed in with. Ask your partner to send a new invitation, or sign in with the invited address.' }
    }
    if (res.status === 403) return { kind: 'blocked', message: 'This questionnaire belongs to another person.' }
    if (!res.ok) return { kind: 'blocked', message: LOAD_FAILED }
    if (data.choose) return { kind: 'choose', invitations: data.choose }
    if (data.complete) return { kind: 'complete' }
    if (data.earlier_version) {
      return { kind: 'blocked', message: 'Your intake was started on an earlier version of the questionnaire. Ask your partner to contact support.' }
    }
    if (!data.invitation_id || !data.answers) return { kind: 'blocked', message: LOAD_FAILED }
    return { kind: 'ready', invitationId: data.invitation_id, answers: data.answers }
  } catch { return { kind: 'blocked', message: LOAD_FAILED } }
}

type SaveResult = 'ok' | 'signin' | 'rejected' | 'failed'

// Answers save after every question. 401 means the sign-in has lapsed; 403/409
// mean the invitation is no longer active or the intake is already submitted.
// Other failures are retried by the next save, except on the final submit,
// which must succeed.
async function partnerSave(invitationId: string, answers: Record<string, string>, complete = false): Promise<SaveResult> {
  try {
    const res = await fetch('/api/partner-intake/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitation_id: invitationId, answers, complete }),
    })
    if (res.ok) return 'ok'
    if (res.status === 401) return 'signin'
    return res.status === 403 || res.status === 409 ? 'rejected' : 'failed'
  } catch { return 'failed' }
}

async function requestSignInLink(email: string): Promise<string> {
  try {
    const res  = await fetch('/api/partner-intake/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json().catch(() => ({})) as { message?: string; error?: string }
    return data.message ?? data.error ?? 'Please try again later.'
  } catch { return 'Please try again later.' }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight:       '100vh',
    backgroundColor: '#0e0c0b',
    padding:         '60px 20px 80px',
  } as React.CSSProperties,

  inner: {
    width:    '100%',
    maxWidth: '680px',
    margin:   '0 auto',
  } as React.CSSProperties,

  eyebrow: {
    fontFamily:    'var(--font-raleway, sans-serif)',
    fontSize:      '10px',
    fontWeight:    700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color:         '#9a7c2e',
    marginBottom:  '12px',
  } as React.CSSProperties,

  heading: {
    fontFamily:   'Georgia, serif',
    fontSize:     'clamp(24px, 5vw, 32px)',
    color:        '#f4f1e8',
    lineHeight:   1.2,
    marginBottom: '12px',
  } as React.CSSProperties,

  subtitle: {
    fontFamily:   'Georgia, serif',
    fontSize:     '15px',
    color:        'rgba(244,241,232,0.55)',
    lineHeight:   1.6,
    marginBottom: '28px',
  } as React.CSSProperties,

  intro: {
    fontFamily:   'Georgia, serif',
    fontSize:     '15px',
    color:        'rgba(244,241,232,0.7)',
    lineHeight:   1.75,
    marginBottom: '40px',
  } as React.CSSProperties,

  progressWrap: {
    position:        'fixed',
    top:             0,
    left:            0,
    right:           0,
    zIndex:          50,
    backgroundColor: '#0e0c0b',
    borderBottom:    '1px solid rgba(154,124,46,0.2)',
    padding:         '10px 20px',
    display:         'flex',
    flexDirection:   'column' as const,
    gap:             '6px',
  } as React.CSSProperties,

  progressBar: {
    width:        '100%',
    height:       '2px',
    background:   'rgba(154,124,46,0.15)',
    borderRadius: '1px',
    overflow:     'hidden',
  } as React.CSSProperties,

  progressFill: (pct: number) => ({
    height:          '100%',
    width:           `${pct}%`,
    backgroundColor: '#9a7c2e',
    borderRadius:    '1px',
    transition:      'width 0.4s ease',
  } as React.CSSProperties),

  progressLabel: {
    fontFamily:    'var(--font-raleway, sans-serif)',
    fontSize:      '10px',
    fontWeight:    600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color:         'rgba(154,124,46,0.7)',
  } as React.CSSProperties,

  questionLabel: {
    fontFamily:    'var(--font-raleway, sans-serif)',
    fontSize:      '10px',
    fontWeight:    700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color:         'rgba(154,124,46,0.7)',
    marginBottom:  '10px',
    display:       'block',
  } as React.CSSProperties,

  sectionTitle: {
    fontFamily:    'var(--font-raleway, sans-serif)',
    fontSize:      '10px',
    fontWeight:    700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    color:         'rgba(154,124,46,0.45)',
    marginBottom:  '20px',
  } as React.CSSProperties,

  questionText: {
    fontFamily:   'Georgia, serif',
    fontSize:     '18px',
    color:        '#f4f1e8',
    lineHeight:   1.5,
    marginBottom: '20px',
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
    minHeight:       '100px',
    lineHeight:      1.6,
    colorScheme:     'dark' as const,
    boxSizing:       'border-box' as const,
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
    fontFamily: 'Georgia, serif',
    fontSize:   '13px',
    color:      '#c45a5a',
    fontStyle:  'italic',
    marginTop:  '10px',
  } as React.CSSProperties,

  confirmHeading: {
    fontFamily:   'Georgia, serif',
    fontSize:     'clamp(24px, 5vw, 32px)',
    color:        '#f4f1e8',
    lineHeight:   1.2,
    marginBottom: '16px',
  } as React.CSSProperties,

  confirmBody: {
    fontFamily: 'Georgia, serif',
    fontSize:   '16px',
    color:      'rgba(244,241,232,0.6)',
    lineHeight: 1.7,
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
      min={question.type === 'number' ? 1 : undefined}
      max={question.type === 'number' ? 10 : undefined}
    />
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

type View = 'loading' | 'ready' | 'complete' | 'choose' | 'signin' | 'blocked'

export default function PartnerIntakeForm() {
  // step -1 = intro, 1..total = questions, total + 1 = confirmation
  const [step,    setStep]    = useState(-1)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [error,   setError]   = useState<string | null>(null)
  const [view,    setView]    = useState<View>('loading')
  const [message, setMessage] = useState('')
  const [invitationId, setInvitationId] = useState('')
  const [choices, setChoices] = useState<{ invitation_id: string; created_at: string }[]>([])
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState('')
  const [sending, setSending] = useState(false)

  const questions = RELATIONAL_QUESTION_LIST
  const total     = questions.length

  const load = useCallback(async (chosen?: string, linkProblem?: string | null) => {
    setView('loading')
    const r = await partnerSession(chosen)
    if (r.kind === 'ready') { setInvitationId(r.invitationId); setAnswers(r.answers); setView('ready'); return }
    if (r.kind === 'choose') { setChoices(r.invitations); setView('choose'); return }
    if (r.kind === 'complete') { setView('complete'); return }
    setMessage(r.kind === 'signin' && linkProblem ? linkProblem : r.message)
    setView(r.kind)
  }, [])

  useEffect(() => {
    let cancelled = false
    adoptLinkSession().then(problem => { if (!cancelled) load(undefined, problem) })
    return () => { cancelled = true }
  }, [load])

  async function sendLink() {
    setSending(true)
    setSent(await requestSignInLink(email))
    setSending(false)
  }

  // Resume: the first unanswered question, or the last one when all are answered but not submitted.
  function beginStep(): number {
    const first = firstUnansweredRelationalIndex(answers)
    return first === -1 ? total : first + 1
  }

  const setAnswer = useCallback((id: string, value: string) => {
    setAnswers(prev => ({ ...prev, [id]: value }))
  }, [])

  function currentQuestion(): IntakeQuestion | null {
    if (step < 1 || step > total) return null
    return questions[step - 1]
  }

  function validateCurrent(): string | null {
    const q = currentQuestion()
    if (!q) return null
    if (q.required && !answers[q.id]?.trim()) {
      return 'This question is required.'
    }
    if (q.type === 'number') {
      const n = Number(answers[q.id])
      if (!answers[q.id]?.trim() || isNaN(n) || n < 1 || n > 10) {
        return 'Please enter a number between 1 and 10.'
      }
    }
    return null
  }

  async function handleAdvance() {
    const err = validateCurrent()
    if (err) { setError(err); return }
    setError(null)

    const q = currentQuestion()
    if (q) {
      const saved = await partnerSave(invitationId, answers, step === total)
      if (saved === 'signin') {
        setMessage('Your sign-in has lapsed. Your saved answers are kept. Request a new sign-in link to continue.')
        setView('signin')
        return
      }
      if (saved === 'rejected') { setError('This invitation is no longer active or your intake is already submitted. Ask your partner to send a new invitation.'); return }
      if (saved === 'failed' && step === total) { setError('Your answers could not be submitted. Please try again.'); return }
    }

    if (step === total) {
      // Final question — save and go to confirmation
      setStep(total + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleBack() {
    setError(null)
    if (step === 1) {
      setStep(-1)
    } else {
      setStep(s => s - 1)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Loading, sign-in, choice, blocked, already complete ────────────────────

  if (view === 'complete') {
    return (
      <div style={S.page}>
        <div style={S.inner}>
          <h1 style={S.confirmHeading}>Your intake is complete.</h1>
          <p style={S.confirmBody}>You can close this page.</p>
        </div>
      </div>
    )
  }

  if (view !== 'ready') {
    return (
      <div style={S.page}>
        <div style={S.inner}>
          <p style={S.eyebrow}>MOTORSUI</p>
          <h1 style={S.heading}>Relationship Intake Questionnaire</h1>
          <p style={S.subtitle}>{view === 'loading' ? 'Loading your intake…' : view === 'choose' ? 'You have more than one invitation. Choose the questionnaire to open.' : message}</p>
          {view === 'choose' && choices.map(c => (
            <button key={c.invitation_id} style={{ ...S.btnSecondary, display: 'block', marginBottom: '12px' }} onClick={() => load(c.invitation_id)}>
              Invitation of {new Date(c.created_at).toLocaleDateString()}
            </button>
          ))}
          {view === 'signin' && (
            <form onSubmit={e => { e.preventDefault(); sendLink() }}>
              <label style={S.questionLabel} htmlFor="partner-email">Email address</label>
              <input id="partner-email" style={S.input} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
              <div style={S.nav}>
                <button style={S.btnPrimary} type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send sign-in link'}</button>
              </div>
              {sent && <p style={S.confirmBody}>{sent}</p>}
            </form>
          )}
        </div>
      </div>
    )
  }

  // ── Intro screen ────────────────────────────────────────────────────────────

  if (step === -1) {
    return (
      <div style={S.page}>
        <div style={S.inner}>
          <p style={S.eyebrow}>MOTORSUI</p>
          <h1 style={S.heading}>Relationship Intake Questionnaire</h1>
          <p style={S.subtitle}>
            Complete your intake form below. Your partner has already submitted theirs.
          </p>
          <p style={S.intro}>{RELATIONAL_INDEPENDENT_COMPLETION}</p>
          <p style={S.intro}>{RELATIONAL_INTRO}</p>
          <button style={S.btnPrimary} onClick={() => setStep(beginStep())}>
            {beginStep() > 1 ? 'Continue' : 'Begin'}
          </button>
        </div>
      </div>
    )
  }

  // ── Confirmation screen ─────────────────────────────────────────────────────

  if (step === total + 1) {
    return (
      <div style={S.page}>
        <div style={S.inner}>
          <h1 style={S.confirmHeading}>Your intake is complete.</h1>
          <p style={S.confirmBody}>You can close this page.</p>
        </div>
      </div>
    )
  }

  // ── Question screen ─────────────────────────────────────────────────────────

  const q   = currentQuestion()
  const pct = Math.round((step / total) * 100)
  const sectionTitle = q ? (questionSectionMap[q.id] ?? '') : ''

  return (
    <>
      {/* Fixed progress bar */}
      <div style={S.progressWrap}>
        <div style={S.progressBar}>
          <div style={S.progressFill(pct)} />
        </div>
        <span style={S.progressLabel}>Question {step} of {total}</span>
      </div>

      <div style={{ ...S.page, paddingTop: '80px' }}>
        <div style={S.inner}>
          {sectionTitle && (
            <p style={S.sectionTitle}>{sectionTitle}</p>
          )}

          {q && (
            <>
              <label style={S.questionLabel}>
                Question {step} of {total}
                {q.required && <span style={{ color: '#9a7c2e', marginLeft: '4px' }}>*</span>}
              </label>
              <p style={S.questionText}>{q.text}</p>
              <QuestionField
                question={q}
                value={answers[q.id] ?? ''}
                onChange={v => setAnswer(q.id, v)}
              />
            </>
          )}

          {error && <p style={S.error}>{error}</p>}

          <div style={S.nav}>
            <button style={S.btnSecondary} onClick={handleBack}>
              Previous
            </button>
            <button style={S.btnPrimary} onClick={handleAdvance}>
              {step === total ? 'Submit' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
