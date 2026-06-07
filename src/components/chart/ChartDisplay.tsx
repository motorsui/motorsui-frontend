interface Section {
  heading: string
  body: string
}

interface ChartDisplayProps {
  interpretation: string
  tier: number
}

function parseInterpretation(text: string): Section[] {
  const lines = text.split('\n')
  const sections: Section[] = []
  let currentHeading = ''
  let currentBody: string[] = []

  for (const line of lines) {
    if (/^#{1,3} /.test(line)) {
      if (currentHeading || currentBody.length > 0) {
        sections.push({ heading: currentHeading, body: currentBody.join('\n').trim() })
      }
      currentHeading = line.replace(/^#{1,3} /, '')
      currentBody = []
    } else {
      currentBody.push(line)
    }
  }

  if (currentHeading || currentBody.length > 0) {
    sections.push({ heading: currentHeading, body: currentBody.join('\n').trim() })
  }

  const result = sections.filter(s => s.body.length > 0)
  return result.length > 0 ? result : [{ heading: '', body: text.trim() }]
}

export default function ChartDisplay({ interpretation, tier }: ChartDisplayProps) {
  const sections = parseInterpretation(interpretation)

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col gap-6">

      {tier === 1 && (
        <div className="border-l-4 border-[#9a7c2e] bg-[#f4f1e8] pl-5 py-4 pr-5 rounded">
          <p className="font-[family-name:var(--font-raleway)] text-xs font-semibold text-[#9a7c2e] uppercase tracking-widest mb-1">
            Tier 1 — Free Reading
          </p>
          <p className="font-[family-name:var(--font-cormorant)] text-base text-[#1e1a18]/70">
            This is your foundational chart reading. Upgrade to Tier 2 for the full
            practitioner-depth report across Jyotish, Human Design, and Gene Keys.
          </p>
        </div>
      )}

      {sections.map((section, i) => (
        <div
          key={i}
          className="border-l-4 border-[#9a7c2e] bg-[#f4f1e8] pl-5 py-5 pr-5 rounded shadow-sm"
        >
          {section.heading && (
            <h2 className="font-[family-name:var(--font-playfair)] text-xl text-[#1e1a18] mb-3">
              {section.heading}
            </h2>
          )}
          <div className="font-[family-name:var(--font-cormorant)] text-lg text-[#1e1a18] leading-relaxed whitespace-pre-line">
            {section.body}
          </div>
        </div>
      ))}

    </div>
  )
}
