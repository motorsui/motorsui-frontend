'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import PartnerIntakeForm from '@/components/intake/PartnerIntakeForm'

function PartnerIntakePage() {
  const params = useSearchParams()
  const id = params.get('id') ?? ''
  if (!id) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0e0c0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f4f1e8', fontFamily: 'Georgia, serif' }}>
      Invalid link.
    </div>
  )
  return <PartnerIntakeForm partnerChartId={id} />
}

export default function Page() {
  return <Suspense><PartnerIntakePage /></Suspense>
}
