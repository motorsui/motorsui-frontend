// Run: npm test
// Behavior test of the astrology-only conclusions filter. The TypeScript source
// is transpiled in memory with the project's own typescript package.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const src = readFileSync(new URL('../src/lib/interpret/domain-conclusions.ts', import.meta.url), 'utf8')
const js  = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { jyotishOnlyConclusions, buildDomainContextBlock, fetchDomainConclusions } =
  await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))

// Shape of build_domain_conclusion() output (domain_conclusion.py).
const career = () => ({
  domain: 'career',
  headline_signals: [
    { system: 'hd', element: 'Sacral Center', score: 0.65, note: 'Sacral Center defined' },
    { system: 'jyotish', planet: 'Moon', role: 'tenth house lord', score: 0.7, note: 'Moon (tenth house lord) in Cancer' },
    { system: 'gene_keys', element: 'Gate 61', score: 0.5, note: 'GK Gate 61: Trauma of Psychosis' },
  ],
  timing: { activation_level: 'active' },
  cross_system: { alignments: ['Gene Keys activations reinforce strong Jyotish placements'], tensions: [] },
  overall: { strength: 'strong', composite_score: 0.84, primary_note: 'Sacral Center defined',
             timing_activation: 'active', alignments_count: 1, tensions_count: 0 },
  intake_adjustment: { adjusted_score: 0.84, strength_adjusted: 'strong', band_changed: false,
                       contradictions: ['intake suggests lower career expression than chart indicates'] },
})

test('astrology products receive no HD or Gene Keys content', () => {
  const out = JSON.stringify(jyotishOnlyConclusions({ career: career() }))
  for (const term of ['"hd"', 'gene_keys', 'Sacral', 'Gene Keys', 'GK Gate', 'cross_system', 'alignments_count'])
    assert.ok(!out.includes(term), term)
})

test('Jyotish evidence, scores and contradictions are preserved', () => {
  const c = jyotishOnlyConclusions({ career: career() }).career
  assert.deepEqual(c.headline_signals.map(s => s.planet), ['Moon'])
  assert.equal(c.overall.primary_note, 'Moon (tenth house lord) in Cancer')
  assert.equal(c.overall.composite_score, 0.84)
  assert.equal(c.intake_adjustment.adjusted_score, 0.84)
  assert.deepEqual(c.intake_adjustment.contradictions, career().intake_adjustment.contradictions)
  assert.equal(buildDomainContextBlock({ career: c }), buildDomainContextBlock({ career: career() }))
})

test('no Jyotish signal leaves no primary note, and null passes through', () => {
  const only = career(); only.headline_signals = only.headline_signals.filter(s => s.system !== 'jyotish')
  assert.equal(jyotishOnlyConclusions({ career: only }).career.overall.primary_note, null)
  assert.equal(jyotishOnlyConclusions(null), null)
})

test('the input object is not mutated', () => {
  const c = career(); jyotishOnlyConclusions({ career: c })
  assert.deepEqual(c, career())
})

async function requestBody(...args) {
  const orig = globalThis.fetch
  let body
  globalThis.fetch = async (_url, init) => { body = JSON.parse(init.body); return { ok: true, json: async () => ({}) } }
  try { await fetchDomainConclusions(...args) } finally { globalThis.fetch = orig }
  return body
}

test('astrology products request Jyotish-only scoring; others do not', async () => {
  const birth = { year: 1981 }
  assert.equal((await requestBody(birth, 'self', null, true)).jyotish_only, true)
  assert.equal('jyotish_only' in (await requestBody(birth, 'relational', null)), false)
})

test('Loving Astro and D-Charts pass jyotishOnly; Loving HD keeps the default', () => {
  const route = f => readFileSync(new URL(`../src/app/api/${f}/route.ts`, import.meta.url), 'utf8')
  assert.match(route('interpret-synastry'), /fetchDomainConclusions\(conclusionBirth, 'relational', intakeA, true\)/)
  assert.match(route('interpret'), /fetchDomainConclusions\(birth as never, 'self', intake, true\)/)
  assert.match(route('interpret-composite'), /fetchDomainConclusions\(conclusionBirth, 'relational', intakeA\)/)
})
