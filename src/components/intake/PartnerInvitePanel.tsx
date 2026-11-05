'use client'

import { useCallback, useEffect, useState } from 'react'

// The purchaser invites Partner B by email. Partner B receives a sign-in link
// at that address; the purchaser never sees a link, a code or Partner B's
// answers, only the invitation's status.

interface InviteStatus {
  invitation: { email: string; created_at: string; expires_at: string; status: 'active' | 'expired' } | null
  started:    boolean
  submitted:  boolean
}

const text: React.CSSProperties = { fontFamily: 'Georgia, serif', fontSize: '15px', color: 'rgba(244,241,232,0.7)', lineHeight: 1.7 }
const btn: React.CSSProperties = {
  backgroundColor: 'transparent', color: '#9a7c2e', border: '1px solid rgba(154,124,46,0.4)', borderRadius: '3px',
  padding: '10px 20px', fontFamily: 'var(--font-raleway, sans-serif)', fontSize: '11px', fontWeight: 600,
  letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', marginRight: '12px', marginTop: '12px',
}
const input: React.CSSProperties = {
  width: '100%', maxWidth: '420px', backgroundColor: '#1a1410', border: '1px solid rgba(154,124,46,0.25)', borderRadius: '3px',
  padding: '11px 14px', color: '#f4f1e8', fontFamily: 'Georgia, serif', fontSize: '14px', outline: 'none',
  colorScheme: 'dark', boxSizing: 'border-box', display: 'block',
}

async function loadStatus(): Promise<InviteStatus | null> {
  const res = await fetch('/api/partner-invite', { cache: 'no-store' }).catch(() => null)
  return res?.ok ? await res.json() as InviteStatus : null
}

export default function PartnerInvitePanel() {
  const [status, setStatus] = useState<InviteStatus | null>(null)
  const [email, setEmail]   = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy]     = useState(false)

  const refresh = useCallback(async () => {
    const next = await loadStatus()
    if (next) setStatus(next)
  }, [])

  useEffect(() => {
    let cancelled = false
    loadStatus().then(next => { if (next && !cancelled) setStatus(next) })
    return () => { cancelled = true }
  }, [])

  async function call(method: 'POST' | 'DELETE', body?: object) {
    setBusy(true)
    setNotice('')
    const res = await fetch('/api/partner-invite', {
      method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
    }).catch(() => null)
    const data = await res?.json().catch(() => ({})) as { error?: string } | undefined
    if (!res?.ok) setNotice(data?.error ?? 'Something went wrong. Please try again.')
    else setNotice(method === 'POST' ? 'Invitation sent. Your partner will receive a sign-in link by email.' : 'Invitation revoked.')
    setBusy(false)
    await refresh()
  }

  if (!status || status.submitted) return null
  const inv = status.invitation

  return (
    <div style={{ maxWidth: '860px', margin: '24px auto 0', padding: '0 24px' }}>
      <div style={text}>
        <p>Your intake is submitted. Your reading generates after your partner submits theirs.</p>
        {inv && (
          <p>
            Invitation for {inv.email}: {inv.status === 'active'
              ? `active until ${new Date(inv.expires_at).toLocaleDateString()}${status.started ? ', questionnaire started' : ''}.`
              : 'expired. Send a new invitation.'}
          </p>
        )}
      </div>
      <form onSubmit={e => { e.preventDefault(); call('POST', { email }) }} style={{ marginTop: '12px' }}>
        <label htmlFor="partner-invite-email" style={{ ...text, fontSize: '13px', display: 'block', marginBottom: '6px' }}>
          {inv ? 'Resend or change the invitation' : "Your partner's email address"}
        </label>
        <input id="partner-invite-email" type="email" required autoComplete="off" value={email}
          placeholder={inv?.email ?? ''} onChange={e => setEmail(e.target.value)} style={input} />
        <button type="submit" disabled={busy} style={btn}>{inv ? 'Send new invitation' : 'Send invitation'}</button>
        {inv?.status === 'active' && (
          <button type="button" disabled={busy} style={btn} onClick={() => call('DELETE')}>Revoke invitation</button>
        )}
        <button type="button" style={btn} onClick={() => window.location.reload()}>Check again</button>
      </form>
      {notice && <p style={{ ...text, fontSize: '13px', marginTop: '12px' }}>{notice}</p>}
    </div>
  )
}
