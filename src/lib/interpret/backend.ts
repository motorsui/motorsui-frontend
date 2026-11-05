import Anthropic from '@anthropic-ai/sdk'
import type { NextRequest } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { extractBirthPayload } from '@/lib/interpret/domain-conclusions'
import { buildParentingIntakePayload } from '@/lib/intake-questions'

// ─── Backend access ───────────────────────────────────────────────────────────
//
// Every call to the backend's governed endpoints (/interpret/*, /internal/*)
// carries the shared secret. Missing secret = fail closed, nothing is generated.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.motorsui.com'

export class InterpretFailure extends Error {
  constructor(message: string, public status = 500, public reasons: string[] = []) {
    super(message)
  }
}

function internalHeaders(): Record<string, string> {
  const secret = process.env.MOTORSUI_INTERNAL_SECRET
  if (!secret) throw new InterpretFailure('Interpretation service is not configured', 503)
  return { 'Content-Type': 'application/json', 'X-MotorSui-Internal': secret }
}

// ─── Governing documents ──────────────────────────────────────────────────────
//
// Served by the backend from its own repository files. Never sent to the browser.
// A non-200 response aborts the whole run: no section is generated from a
// partial or error-page document.

export async function fetchGoverningDoc(name: string): Promise<string> {
  const r = await fetch(`${API_URL}/internal/docs/${name}`, { headers: internalHeaders(), cache: 'no-store' })
  if (!r.ok) throw new InterpretFailure(`Governing document ${name} unavailable (${r.status})`, 502)
  const text = await r.text()
  if (!text.trim()) throw new InterpretFailure(`Governing document ${name} is empty`, 502)
  return text
}

// ─── Backend-generated sections ──────────────────────────────────────────────

export interface Usage { input_tokens: number; output_tokens: number; attempts?: number }

export async function callBackendInterpret(
  path: string,
  body: Record<string, unknown>,
): Promise<{ text: string; usage: Usage; model: string }> {
  const r = await fetch(`${API_URL}${path}`, {
    method:  'POST',
    headers: internalHeaders(),
    body:    JSON.stringify(body),
    cache:   'no-store',
  })
  const json = await r.json().catch(() => null) as Record<string, unknown> | null
  if (!r.ok) {
    const detail = (json?.detail ?? json) as Record<string, unknown> | string | null
    const reasons = (typeof detail === 'object' && detail && Array.isArray(detail.reasons)) ? detail.reasons as string[] : []
    throw new InterpretFailure(`Backend ${path} returned ${r.status}`, r.status, reasons)
  }
  const text = typeof json?.text === 'string' ? json.text : ''
  if (!text.trim()) throw new InterpretFailure(`Backend ${path} returned empty text`, 502)
  return { text, usage: json?.usage as Usage, model: String(json?.model ?? '') }
}

// ─── Validation (same rule set as the backend applies before storage) ────────

export type DirectProduct = 'dcharts' | 'synastry' | 'composite'

export async function validateText(section: string, text: string, product: DirectProduct): Promise<{ text: string; violations: string[]; revision?: string | null }> {
  const r = await fetch(`${API_URL}/internal/validate`, {
    method:  'POST',
    headers: internalHeaders(),
    body:    JSON.stringify({ section, text, product }),
    cache:   'no-store',
  })
  if (!r.ok) throw new InterpretFailure(`Validation service returned ${r.status}`, 502)
  return await r.json() as { text: string; violations: string[]; revision?: string | null }
}

// ─── Frontend-direct generation (Loving + D-Charts) ──────────────────────────
//
// Bounded attempts. A truncated response (stop_reason max_tokens) is never
// stored: the section retries with a larger budget, then fails. A draft that
// fails the voice checks goes back with the validator's revision request so
// only the violating sentences are rewritten.

const MAX_ATTEMPTS       = 2
const MAX_TOKENS_CEILING = 8192
const MODEL              = 'claude-sonnet-4-6'

export async function generateDirect(opts: {
  anthropic: Anthropic
  system:    string
  user:      string
  section:   string
  product:   DirectProduct
  maxTokens?: number
}): Promise<{ text: string; usage: Usage; model: string }> {
  let maxTokens = opts.maxTokens ?? 4096
  const reasons: string[] = []
  const usage: Usage = { input_tokens: 0, output_tokens: 0, attempts: 0 }
  let messages: Anthropic.MessageParam[] = [{ role: 'user', content: opts.user }]

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const message = await opts.anthropic.messages.create({
      model:       MODEL,
      max_tokens:  maxTokens,
      temperature: 0.3,
      system:      opts.system,
      messages,
    })
    usage.input_tokens  += message.usage.input_tokens
    usage.output_tokens += message.usage.output_tokens
    usage.attempts       = attempt

    if (message.stop_reason === 'max_tokens') {
      reasons.push('truncated')
      maxTokens = Math.min(maxTokens * 2, MAX_TOKENS_CEILING)
      continue
    }
    const raw = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')
    if (!raw.trim()) { reasons.push('empty'); continue }

    const checked = await validateText(opts.section, raw, opts.product)
    if (checked.violations.length > 0) {
      reasons.push(...checked.violations)
      if (checked.revision) {
        messages = [messages[0],
                    { role: 'assistant', content: checked.text },
                    { role: 'user', content: checked.revision }]
      }
      continue
    }
    return { text: checked.text, usage, model: MODEL }
  }
  throw new InterpretFailure('generation_failed_checks', 422, reasons)
}

// ─── Placeholder substitution (CLAUDE_SYSTEM.md ACTIVE SESSION PARAMETERS) ───

const PARAM_BLOCK = /(ACTIVE SESSION PARAMETERS\s*\n\s*\n)(Product:[\s\S]*?Classical only: \[TRUE \/ FALSE\])/
const UNRESOLVED  = /\[(?:PRODUCT_NAME|CHART_JSON_[AB][^\]]*|INTAKE_JSON[^\]]*|DOMAIN_CONCLUSIONS_JSON[^\]]*|TRUE \/ FALSE)\]/

export function configureSystemDoc(systemDoc: string, params: {
  product:        string
  personA:        string
  personB?:       string
  intake:         boolean
  conclusions:    boolean
  classicalOnly:  boolean
}): string {
  const lines = [
    `Product: ${params.product}`,
    `Person A: provided in the user message as ${params.personA}`,
  ]
  if (params.personB)     lines.push(`Person B: provided in the user message as ${params.personB}`)
  if (params.intake)      lines.push('Intake form: provided in the user message as intake')
  if (params.conclusions) lines.push('Domain conclusions: provided in the user message as domain_conclusions')
  lines.push(`Classical only: ${params.classicalOnly ? 'TRUE' : 'FALSE'}`)

  if (!PARAM_BLOCK.test(systemDoc)) throw new InterpretFailure('CLAUDE_SYSTEM.md session block not found', 502)
  const out = systemDoc.replace(PARAM_BLOCK, (_m, head: string) => head + lines.join('\n'))
  assertResolved(out)
  return out
}

export function assertResolved(prompt: string): void {
  const m = prompt.match(UNRESOLVED)
  if (m) throw new InterpretFailure(`Unresolved placeholder ${m[0]}`, 500)
}

// ─── Ownership, entitlement and storage ──────────────────────────────────────

export async function hasEntitlement(supabase: SupabaseClient, userId: string, keys: string[]): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('purchased_products').eq('id', userId).maybeSingle()
  const owned = (data?.purchased_products as string[] | null) ?? []
  return keys.some(k => owned.includes(k))
}

// RLS limits the user client to the caller's own rows; the user_id filter
// states the same rule explicitly so a policy change cannot widen it.
export async function loadOwnedChart(
  supabase: SupabaseClient,
  userId: string,
  filter: { id: string } | { label: string },
): Promise<Record<string, unknown> | null> {
  let q = supabase.from('charts').select('*').eq('user_id', userId)
  q = 'id' in filter ? q.eq('id', filter.id) : q.eq('chart_label', filter.label)
  const { data } = await q.order('generated_at', { ascending: false }).limit(1).maybeSingle()
  return (data as Record<string, unknown> | null) ?? null
}

export async function loadSelfChart(supabase: SupabaseClient, userId: string): Promise<Record<string, unknown> | null> {
  const { data } = await supabase
    .from('charts').select('*')
    .eq('user_id', userId)
    .not('chart_label', 'in', '("partner","child")')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as Record<string, unknown> | null) ?? null
}

export async function writeSection(admin: SupabaseClient, chartId: string, column: string, text: string): Promise<void> {
  await writeRow(admin, 'charts', chartId, { [column]: text })
}

// A write that does not land on exactly one row is a failure, never a success.
export async function writeRow(
  admin: SupabaseClient,
  table: string,
  id: string,
  values: Record<string, unknown>,
): Promise<void> {
  const label = Object.keys(values).join(',')
  const { data, error } = await admin
    .from(table)
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
  if (error) throw new InterpretFailure(`Storage write failed for ${label}: ${error.message}`, 502)
  if (!data || data.length !== 1) throw new InterpretFailure(`Storage write for ${label} matched ${data?.length ?? 0} rows`, 502)
}

// Loving: the partner must be the caller's own chart, linked from the self
// chart or labelled 'partner'.
export async function loadOwnedPair(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ self: Record<string, unknown>; partner: Record<string, unknown> } | Response> {
  const self = await loadSelfChart(supabase, userId)
  if (!self) return jsonError('Chart not found', 404)
  const partner = typeof self.partner_chart_id === 'string' && self.partner_chart_id
    ? await loadOwnedChart(supabase, userId, { id: self.partner_chart_id })
    : await loadOwnedChart(supabase, userId, { label: 'partner' })
  if (!partner) return jsonError('Partner chart not found', 404)
  return { self, partner }
}

// Pair rows (synastry_interpretations, hd_composite_interpretations) have RLS
// enabled with no policies, so they are read and written server-side only.
// Returns a Response on failure (called before the stream opens). A concurrent
// first run can race the insert; the unique (chart_id_a, chart_id_b) key makes
// the loser re-read the winner's row.
export async function findOrCreatePairRow(
  admin: SupabaseClient,
  table: string,
  chartIdA: string,
  chartIdB: string,
): Promise<Record<string, unknown> | Response> {
  const lookup = () => admin.from(table).select('*').eq('chart_id_a', chartIdA).eq('chart_id_b', chartIdB).maybeSingle()
  const { data: existing, error } = await lookup()
  if (error) return jsonError(`${table} lookup failed`, 502)
  if (existing) return existing as Record<string, unknown>
  const { data: inserted, error: insertError } = await admin
    .from(table).insert({ chart_id_a: chartIdA, chart_id_b: chartIdB }).select('*').single()
  if (inserted) return inserted as Record<string, unknown>
  if (insertError?.code === '23505') {
    const { data: raced } = await lookup()
    if (raced) return raced as Record<string, unknown>
  }
  console.error(`[interpret] ${table} insert failed:`, insertError?.message ?? 'no row')
  return jsonError(`${table} insert failed`, 502)
}

// Public calculation endpoints (no secret needed). Non-200 aborts the run.
export async function fetchCalculation(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const r = await fetch(`${API_URL}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    cache:   'no-store',
  })
  if (!r.ok) throw new InterpretFailure(`Calculation ${path} returned ${r.status}`, 502)
  return await r.json() as Record<string, unknown>
}

export function birthFromChartJson(chartJson: unknown): Record<string, number> | null {
  const b = extractBirthPayload(chartJson)
  return b ? { ...b, second: 0 } : null
}

// ─── Response helpers ────────────────────────────────────────────────────────

export function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } })
}

export { isMissing } from '@/lib/interpret/sections'
import { isMissing } from '@/lib/interpret/sections'

// SSE stream with the event shape every product client already consumes:
//   { column, status: 'done', chars } | { column, status: 'error', error }
//   { done: true, completed, total, skipped }
export function sectionStream(
  tag: string,
  columns: string[],
  skipped: string[],
  runOne: (column: string) => Promise<{ text: string; usage?: Usage }>,
): Response {
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      const send = (payload: object) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      const completed: string[] = []
      for (const column of columns) {
        try {
          const { text, usage } = await runOne(column)
          completed.push(column)
          console.log(`[${tag}] ${column} stored — ${text.length} chars | in=${usage?.input_tokens ?? '?'} out=${usage?.output_tokens ?? '?'}`)
          send({ column, status: 'done', chars: text.length })
        } catch (err) {
          const f = err instanceof InterpretFailure ? err : null
          console.error(`[${tag}] ${column} failed:`, f ? `${f.status} ${f.message} ${f.reasons.join(' | ')}` : err)
          send({ column, status: 'error', error: f ? f.message : 'generation_failed' })
          // Configuration failures affect every section; stop instead of repeating them.
          if (f && (f.status === 503 || f.status === 401)) break
        }
      }
      send({ done: true, completed, total: columns.length + skipped.length, skipped })
      controller.close()
    },
  })
  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  })
}

// ─── Backend-path product route (Embody Astro/HD, Parenting Astro/HD) ────────
//
// The browser sends only which chart row to fill. Chart data, birth data and
// intake are read from the caller's own rows; the governed prompt is built and
// sent by the backend. Sections already stored are never regenerated.

export interface BackendTarget {
  row:  Record<string, unknown>                       // row the sections are written to
  body: (section: string) => Record<string, unknown>  // backend request body per section
}

export async function backendProductRoute(request: NextRequest, opts: {
  tag:          string
  entitlements: string[]
  sections:     readonly string[]
  path:         string
  resolve:      (ctx: { supabase: SupabaseClient; user: User; chartId: string | null }) =>
                  Promise<BackendTarget | Response>
}): Promise<Response> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  if (!(await hasEntitlement(supabase, user.id, opts.entitlements))) return jsonError('Not purchased', 403)

  const body    = await request.json().catch(() => ({})) as { chart_id?: unknown; columns?: unknown }
  const chartId = typeof body.chart_id === 'string' && body.chart_id ? body.chart_id : null
  const asked   = Array.isArray(body.columns) ? new Set(body.columns.map(String)) : null

  const target = await opts.resolve({ supabase, user, chartId })
  if (target instanceof Response) return target

  const missing = opts.sections.filter(s => isMissing(target.row[s]) && (!asked || asked.has(s)))
  const skipped = opts.sections.filter(s => !missing.includes(s))
  const rowId   = String(target.row.id)
  const admin   = createAdminClient()

  return sectionStream(opts.tag, missing, skipped, async section => {
    const result = await callBackendInterpret(opts.path, target.body(section))
    await writeSection(admin, rowId, section, result.text)
    return result
  })
}

// Parenting: the parent is the caller's own (self) chart, which holds the
// parenting intake; sections are written to the child row. The child must be
// the caller's chart, linked from the self chart or labelled 'child'.
export async function resolveParenting(
  { supabase, user, chartId }: { supabase: SupabaseClient; user: User; chartId: string | null },
): Promise<BackendTarget | Response> {
  if (!chartId) return jsonError('chart_id required', 400)
  const parent = await loadSelfChart(supabase, user.id)
  const child  = await loadOwnedChart(supabase, user.id, { id: chartId })
  if (!parent || !child) return jsonError('Chart not found', 404)
  if (child.id !== parent.child_chart_id && child.chart_label !== 'child') return jsonError('Not a child chart', 400)
  if (parent.intake_parenting_complete !== true) return jsonError('Parenting intake incomplete', 409)

  // Child's chart only: the parent's row supplies ownership and the intake, never birth data.
  const childBirth = birthFromChartJson(child.chart_json)
  if (!childBirth) return jsonError('Chart has no usable birth data', 422)
  // Each answer travels with its question wording and the version it was answered under.
  const intake = buildParentingIntakePayload(parent.intake_parenting)
  return { row: child, body: section => ({ child: childBirth, section, intake }) }
}
