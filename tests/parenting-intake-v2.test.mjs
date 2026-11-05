// Run: npm test
// Parenting By Design v2 (50 questions) against the owner's finalized document,
// kept verbatim in tests/fixtures/parenting-by-design-v2.spec.txt. The TypeScript
// source is transpiled in memory with the project's own typescript package.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const read = rel => readFileSync(new URL(rel, import.meta.url), 'utf8')
const js = ts.transpileModule(read('../src/lib/intake-questions.ts'),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const iq = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))

// ── The supplied document, parsed line by line ───────────────────────────────

function parseSpec(text) {
  const sections = []
  let q = null
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line === 'PARENTING BY DESIGN' || line === 'Parent and Child Intake Questionnaire') continue
    let m
    if ((m = line.match(/^(SECTION \d+ — .+)$/))) { sections.push({ title: m[1], questions: [] }); continue }
    if ((m = line.match(/^(\d+)\. \[([^\]]+)\] (.+)$/))) {
      q = { number: Number(m[1]), tag: m[2], source: m[2].match(/p\d+/g), text: m[3], required: true }
      sections.at(-1).questions.push(q)
      continue
    }
    if (line === 'Optional.') { q.required = false; continue }
    if ((m = line.match(/^(?:Living arrangement d|D)ropdown: (.+)\.$/))) { q.options = m[1].split('; '); continue }
    if ((m = line.match(/^Additional text field: (.+)$/))) { q.detail = m[1]; continue }
    throw new Error('Unparsed spec line: ' + line)
  }
  return sections
}

const spec = parseSpec(read('./fixtures/parenting-by-design-v2.spec.txt'))
const specQs = spec.flatMap(s => s.questions)
const active = iq.PARENTING_QUESTION_LIST
const v1 = iq.PARENTING_SECTIONS_V1.flatMap(s => s.questions)
const REMOVED = ['p2', 'p9', 'p34', 'p41', 'p61', 'p66', 'p67', 'p68']

// ── Definitions ──────────────────────────────────────────────────────────────

test('exactly 50 questions, numbered 1 to 50 in the document order', () => {
  assert.equal(specQs.length, 50)
  assert.deepEqual(specQs.map(q => q.number), Array.from({ length: 50 }, (_, i) => i + 1))
  assert.equal(active.length, 50)
  assert.deepEqual(active.map(q => q.id), specQs.map(q => `pv2_${String(q.number).padStart(2, '0')}`))
})

test('every question matches the supplied wording character for character', () => {
  specQs.forEach((s, i) => assert.equal(active[i].text, s.text, `question ${s.number}`))
})

test('ten sections with the supplied headings, holding the supplied questions', () => {
  assert.deepEqual(iq.PARENTING_SECTIONS.map(s => s.title), spec.map(s => s.title))
  iq.PARENTING_SECTIONS.forEach((s, i) =>
    assert.deepEqual(s.questions.map(q => q.text), spec[i].questions.map(q => q.text), s.title))
})

test('field types and dropdown options', () => {
  specQs.forEach((s, i) => {
    const q = active[i]
    if (s.options) {
      assert.equal(q.type, 'select', `question ${s.number}`)
      assert.deepEqual(q.options, s.options, `question ${s.number}`)
    } else {
      assert.equal(q.type, 'textarea', `question ${s.number}`)
      assert.equal(q.options, undefined, `question ${s.number}`)
    }
  })
  assert.deepEqual(specQs.filter(s => s.options).map(s => s.number), [3, 4])
})

test('question 4 carries the additional text field on the same screen', () => {
  const q4 = active[3]
  assert.equal(q4.detail.text, specQs[3].detail)
  assert.equal(q4.detail.id, 'pv2_04_household')
  assert.equal(q4.detail.type, 'textarea')
  assert.equal(active.filter(q => q.detail).length, 1)
})

// Owner decision, 2026-11-04: all 50 are mandatory, overriding the document's
// "Optional." on 15, 21, 28 and 36. The fixture keeps the document as supplied.
test('every question is required, including those the document marks Optional', () => {
  assert.deepEqual(specQs.filter(s => !s.required).map(s => s.number), [15, 21, 28, 36])
  active.forEach((q, i) => assert.equal(q.required, true, `question ${i + 1}`))
  assert.equal(active[3].detail.required, true)
})

test('original IDs stay traceable: merges, revisions and removals', () => {
  specQs.forEach((s, i) => assert.deepEqual(active[i].source, s.source, `question ${s.number}`))
  assert.equal(active.filter(q => q.revision === 'merged').length, 9)
  assert.deepEqual(active.filter(q => q.revision === 'revised').map(q => q.source[0]), ['p57', 'p58'])

  const used = active.flatMap(q => q.source)
  assert.equal(new Set(used).size, used.length, 'each v1 question appears at most once')
  const v1Ids = v1.map(q => q.id)
  assert.equal(v1Ids.length, 67)
  assert.ok(used.every(id => v1Ids.includes(id)))
  assert.deepEqual(v1Ids.filter(id => !used.includes(id)), REMOVED)
})

test('no obsolete question in the active form', () => {
  const ids = active.flatMap(q => [q.id, q.detail?.id]).filter(Boolean)
  assert.ok(ids.every(id => /^pv2_/.test(id)), 'only versioned IDs are active')
  const activeTexts = new Set(active.map(q => q.text))
  for (const old of v1) {
    const kept = active.some(q => q.source.length === 1 && !q.revision && q.source[0] === old.id)
    if (!kept) assert.ok(!activeTexts.has(old.text), `${old.id} wording is not active`)
  }
  const sections = iq.getSections('parenting').slice(1).flatMap(s => s.questions)
  assert.deepEqual(sections.map(q => q.id), active.map(q => q.id))
})

test('the v1 form is retained unchanged as the historical record', () => {
  assert.equal(v1.find(q => q.id === 'p57').text,
    'Being fully aware that we all carry attachment patterns across different dynamics, what attachment style would you say you lean toward most in your parenting?')
  assert.equal(v1.find(q => q.id === 'p2').text, 'What is the first thing most people notice about your child when they meet them?')
})

// ── Versioning and storage ───────────────────────────────────────────────────

const fullAnswers = () => {
  const a = { c_name: 'A', c_date: '2018-01-01', c_time: '08:00', c_city: 'X', c_country: 'Y' }
  for (const q of active) {
    a[q.id] = q.options ? q.options[0] : `answer ${q.id}`
    if (q.detail) a[q.detail.id] = 'household'
  }
  return a
}

test('version of a stored intake', () => {
  assert.equal(iq.PARENTING_QUESTIONNAIRE_VERSION, 'parenting-v2')
  assert.equal(iq.parentingIntakeVersion(null), null)
  assert.equal(iq.parentingIntakeVersion({ c_name: 'A', c_date: '2018-01-01' }), null)
  assert.equal(iq.parentingIntakeVersion({ c_name: 'A', p1: 'x' }), 'parenting-v1')
  assert.equal(iq.parentingIntakeVersion({ _questionnaire_version: 'parenting-v2', pv2_01: 'x' }), 'parenting-v2')
})

test('stored submission: stamped, birth data kept, keys from other versions dropped', () => {
  const stored = iq.toParentingSubmission({ ...fullAnswers(), p1: 'old', p62: 'x', _questionnaire_version: 'parenting-v1', extra: 'x', pv2_02: 7 })
  assert.equal(stored._questionnaire_version, 'parenting-v2')
  assert.equal(stored.c_name, 'A')
  assert.equal(stored.pv2_04_household, 'household')
  assert.equal(stored.p1, undefined)
  assert.equal(stored.extra, undefined)
  assert.equal(stored.pv2_02, undefined, 'non-string values are not stored')
})

test('required check covers every question and the Q4 text field', () => {
  const a = fullAnswers()
  assert.deepEqual(iq.missingParentingAnswers(a), [])
  for (const id of ['pv2_15', 'pv2_21', 'pv2_28', 'pv2_36']) delete a[id]
  assert.deepEqual(iq.missingParentingAnswers(a), ['pv2_15', 'pv2_21', 'pv2_28', 'pv2_36'])
  Object.assign(a, { pv2_15: 'x', pv2_21: 'x', pv2_28: 'x', pv2_36: 'x', pv2_04_household: '  ' })
  assert.deepEqual(iq.missingParentingAnswers(a), ['pv2_04_household'])
})

test('resume starts at the first unanswered required question', () => {
  const a = fullAnswers()
  assert.equal(iq.firstUnansweredParentingIndex(a), -1)
  delete a.pv2_36
  assert.equal(iq.firstUnansweredParentingIndex(a), 35, 'formerly optional question now blocks')
  a.pv2_36 = 'x'
  delete a.pv2_30
  delete a.pv2_04_household
  assert.equal(iq.firstUnansweredParentingIndex(a), 3)
  a.pv2_04_household = 'x'
  assert.equal(iq.firstUnansweredParentingIndex(a), 29)
})

// ── Interpretation payload ───────────────────────────────────────────────────

test('engine receives all 50 questions, each answer beside its own wording', () => {
  const p = iq.buildParentingIntakePayload(iq.toParentingSubmission(fullAnswers()))
  assert.equal(p.questionnaire_version, 'parenting-v2')
  assert.equal(p.responses.length, 50)
  p.responses.forEach((r, i) => {
    assert.equal(r.number, i + 1)
    assert.equal(r.id, active[i].id)
    assert.equal(r.question, specQs[i].text)
    assert.deepEqual(r.source_ids, specQs[i].source)
    assert.equal(r.answer, active[i].options ? active[i].options[0] : `answer ${active[i].id}`)
  })
  assert.deepEqual(p.responses[3].detail, { id: 'pv2_04_household', question: specQs[3].detail, answer: 'household' })
  assert.equal(p.child_details.c_name, 'A')
  const words = JSON.stringify(p)
  for (const id of REMOVED) assert.ok(!words.includes(v1.find(q => q.id === id).text), `${id} absent`)
})

test('an unanswered question reaches the engine as null, never omitted', () => {
  const a = fullAnswers(); delete a.pv2_15
  const p = iq.buildParentingIntakePayload(iq.toParentingSubmission(a))
  assert.equal(p.responses[14].answer, null)
})

test('a v1 intake is read with v1 wording, never remapped to v2', () => {
  const p = iq.buildParentingIntakePayload({ c_name: 'B', p1: 'v1 answer', p57: 'secure' })
  assert.equal(p.questionnaire_version, 'parenting-v1')
  assert.equal(p.responses.length, 67)
  assert.equal(p.responses.find(r => r.id === 'p57').answer, 'secure')
  assert.equal(p.responses.find(r => r.id === 'p57').question, v1.find(q => q.id === 'p57').text)
  assert.ok(p.responses.every(r => !r.id.startsWith('pv2_')))
  assert.equal(iq.buildParentingIntakePayload(null), null)
})

// ── Routes and form wiring (source checks) ───────────────────────────────────

test('autosave refuses to replace a submitted or earlier-version intake', () => {
  const src = read('../src/app/api/autosave-parenting-intake/route.ts')
  assert.match(src, /chart\.user_id !== user\.id/)
  assert.match(src, /intake_parenting_complete === true\) return NextResponse\.json\([^)]*\{ status: 409 \}/)
  assert.match(src, /storedVersion !== PARENTING_QUESTIONNAIRE_VERSION/)
  assert.match(src, /update\(\{ intake_parenting: toParentingSubmission\(answers\) \}\)/)
})

test('final submit: same guards, required check, stamped write, child link kept', () => {
  const src = read('../src/app/api/save-intake/route.ts')
  const branch = src.slice(src.indexOf("if (formType === 'parenting')"))
  assert.match(branch, /intake_parenting_complete === true\) \{\s*return NextResponse\.json\([^)]*\{ status: 409 \}/)
  assert.match(branch, /storedVersion !== PARENTING_QUESTIONNAIRE_VERSION/)
  assert.match(branch, /missingParentingAnswers\(answers\)\.length > 0/)
  assert.match(branch, /intake_parenting: toParentingSubmission\(answers\), intake_parenting_complete: true, child_chart_id: childChartId/)
  assert.ok(branch.indexOf('intake_parenting_complete === true') < branch.indexOf('createPersonBChart'),
    'guards run before any child chart is created')
})

test('generation sends the structured intake from the parent row', () => {
  const src = read('../src/lib/interpret/backend.ts')
  const resolver = src.slice(src.indexOf('export async function resolveParenting')).split('\n}\n')[0]
  assert.match(resolver, /const intake = buildParentingIntakePayload\(parent\.intake_parenting\)/)
  assert.match(resolver, /intake_parenting_complete !== true/)
})

test('form derives its length from the definitions and renders dropdowns', () => {
  const src = read('../src/components/intake/ParentingIntakeForm.tsx')
  assert.doesNotMatch(src, /\b6[789]\b/, 'no hardcoded v1 step counts')
  assert.match(src, /const TOTAL\s+= PARENTING_QUESTION_LIST\.length/)
  assert.match(src, /question\.type === 'select' && question\.options/)
  assert.match(src, /<AnswerField question=\{q\.detail\}/)
  assert.match(src, /await autosave\(chartId, answers\)/)
  assert.match(src, /version !== PARENTING_QUESTIONNAIRE_VERSION\) return LEGACY_STEP/)
})

test('a fully answered but unsubmitted intake reopens on the last question, not the confirmation', () => {
  const form = readFileSync(new URL('../src/components/intake/ParentingIntakeForm.tsx', import.meta.url), 'utf8')
  assert.match(form, /return firstUnanswered === -1 \? TOTAL : firstUnanswered \+ 1/)
  assert.doesNotMatch(form, /firstUnanswered === -1 \? CONFIRM_STEP/)
})
