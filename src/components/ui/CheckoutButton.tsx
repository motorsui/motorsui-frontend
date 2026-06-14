'use client'

import { useState } from 'react'

interface CheckoutButtonProps {
  priceId:  string
  label?:   string
  disabled?: boolean
}

export default function CheckoutButton({
  priceId,
  label    = 'Buy Now',
  disabled = false,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleClick() {
    if (disabled || loading || !priceId) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ priceId }),
      })
      const data = await res.json() as { url?: string; error?: string }

      if (!res.ok || !data.url) {
        setError(data.error ?? 'Could not start checkout. Please try again.')
        setLoading(false)
        return
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch {
      setError('Could not start checkout. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 self-start mt-2">
      <button
        onClick={handleClick}
        disabled={disabled || loading}
        className="inline-block font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.14em] uppercase bg-[#9a7c2e] text-[#f4f1e8] px-5 py-2.5 rounded hover:bg-[#b8962e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? 'Redirecting...' : label}
      </button>
      {error && (
        <p className="font-[family-name:var(--font-cormorant)] text-sm text-[#6b2737]">
          {error}
        </p>
      )}
    </div>
  )
}
