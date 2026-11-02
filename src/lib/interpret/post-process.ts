import Anthropic from '@anthropic-ai/sdk'

// ─── 1. Em dash removal (deterministic) ──────────────────────────────────────
// Replaces all em dashes with comma-space. No model call required.

export function removeEmDashes(text: string): string {
  return text
    .replace(/\s*—\s*/g, ', ')
    .replace(/,\s*,/g, ', ')   // prevent double commas
    .replace(/\.\s*,/g, '.')   // prevent period-comma artifacts
    .replace(/,\s*\./g, '.')
}

// ─── 2. "is not" / "are not" correction (model-assisted) ─────────────────────
// Detects violations, sends the full text back for a targeted affirmative rewrite.
// Uses temperature 0.1 and no system prompt — purely mechanical correction pass.
// Returns original text unchanged if no violations, if the call fails, or if the
// rewrite was truncated (stop_reason other than end_turn) or empty.

export async function fixIsNotViolations(
  text: string,
  anthropic: Anthropic,
  label = ''
): Promise<string> {
  if (!/\bis not\b|\bare not\b/i.test(text)) return text

  const violationCount = (text.match(/\b(?:is not|are not)\b/gi) ?? []).length
  console.log(
    `[post-process${label ? ' ' + label : ''}] ` +
    `${violationCount} "is not"/"are not" violation(s) detected — running correction pass`
  )

  try {
    const wordCount = text.split(/\s+/).length
    const message   = await anthropic.messages.create({
      model:       'claude-sonnet-4-6',
      max_tokens:  Math.min(Math.ceil(wordCount * 2), 8192),
      temperature: 0.1,
      messages: [{
        role:    'user',
        content:
          'Rewrite the following text. The only permitted change is removing every ' +
          'instance of "is not" and "are not" by rewriting those phrases as affirmative ' +
          'statements. Do not change any other word, sentence structure, or punctuation. ' +
          'Return the full rewritten text and nothing else.\n\n' + text,
      }],
    })

    const rewritten = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')
    // A truncated or empty rewrite would replace good text with partial text.
    if (message.stop_reason !== 'end_turn' || !rewritten.trim()) {
      console.error(
        `[post-process${label ? ' ' + label : ''}] correction pass unusable ` +
        `(stop_reason=${message.stop_reason}) — returning original`
      )
      return text
    }
    // The rewrite is model output, so it gets the deterministic clean again.
    return removeEmDashes(rewritten)
  } catch (err) {
    console.error(
      `[post-process${label ? ' ' + label : ''}] correction pass failed — returning original:`,
      err
    )
    return text
  }
}

// ─── Combined post-processor ──────────────────────────────────────────────────
// Run after every generation before DB write.
// label: section column name for logging context.

export async function postProcess(
  text: string,
  anthropic: Anthropic,
  label = ''
): Promise<string> {
  const emDashCount = (text.match(/—/g) ?? []).length
  if (emDashCount > 0) {
    console.log(
      `[post-process${label ? ' ' + label : ''}] removing ${emDashCount} em dash(es)`
    )
  }

  const withoutEmDashes = removeEmDashes(text)
  return fixIsNotViolations(withoutEmDashes, anthropic, label)
}
