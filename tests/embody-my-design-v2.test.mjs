// Run: npm test
// Embody My Design v2 (40 questions, 13 sections) against the owner's supplied
// document, kept verbatim in tests/fixtures/embody-my-design-v2.spec.txt. The
// TypeScript source is transpiled in memory with the project's own typescript package.
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
  const doc = { intro: [], sections: [], requirements: [] }
  let part = 'head'
  let q = null
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line === '⸻') continue
    let m
    if (line === 'RESPONSE AND INTERPRETATION REQUIREMENTS') { part = 'requirements'; continue }
    if (part === 'requirements') { doc.requirements.push(line); continue }
    if (part === 'head') {
      if (['EMBODY MY DESIGN', 'Personal Discovery Questionnaire', '40 Questions | 13 Sections'].includes(line)) continue
      if (!/^SECTION /.test(line)) { doc.intro.push(line); continue }
      part = 'body'
    }
    if ((m = line.match(/^(SECTION \d+ — .+)$/))) { doc.sections.push({ title: m[1], questions: [] }); q = null; continue }
    if ((m = line.match(/^Internal astrological association: (.+)$/))) { doc.sections.at(-1).association = m[1]; continue }
    if ((m = line.match(/^(\d+)\. \[([^\]]+)\]$/))) {
      const source = m[2].match(/s\d+/g)
      q = { number: Number(m[1]), tag: m[2], source: source ?? undefined, text: null }
      doc.sections.at(-1).questions.push(q)
      continue
    }
    if ((m = line.match(/^Response: (.+)$/))) { q.response = m[1]; continue }
    if (q && q.text === null) { q.text = line; continue }
    if (q && !q.note) { q.note = line; continue }
    throw new Error('Unparsed spec line: ' + line)
  }
  return doc
}

const doc = parseSpec(read('./fixtures/embody-my-design-v2.spec.txt'))
const spec = doc.sections
const specQs = spec.flatMap(s => s.questions)
const active = iq.SELF_QUESTION_LIST
const v1 = iq.SELF_SECTIONS_V1.flatMap(s => s.questions)
const MBTI = ['ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP', 'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ']
const pad = n => String(n).padStart(2, '0')

// ── Definitions ──────────────────────────────────────────────────────────────

test('exactly 40 questions, numbered 1 to 40 in the document order', () => {
  assert.equal(specQs.length, 40)
  assert.deepEqual(specQs.map(q => q.number), Array.from({ length: 40 }, (_, i) => i + 1))
  assert.equal(active.length, 40)
  assert.deepEqual(active.map(q => q.id), specQs.map(q => `emd2_${pad(q.number)}`))
})

test('every question matches the supplied wording character for character', () => {
  specQs.forEach((s, i) => assert.equal(active[i].text, s.text, `question ${s.number}`))
  assert.ok(active[34].text.includes('anyone else’s'), 'curly apostrophe kept in question 35')
})

test('thirteen sections with the supplied headings, holding the supplied questions', () => {
  assert.equal(spec.length, 13)
  assert.deepEqual(iq.SELF_SECTIONS.map(s => s.title), spec.map(s => s.title))
  iq.SELF_SECTIONS.forEach((s, i) =>
    assert.deepEqual(s.questions.map(q => q.text), spec[i].questions.map(q => q.text), s.title))
})

test('house associations are stored internally and never part of a visible heading', () => {
  iq.SELF_SECTIONS.forEach((s, i) => {
    assert.equal(s.association, spec[i].association, s.title)
    assert.doesNotMatch(s.title, /House|\bH\d+\b/, 'heading carries no house reference')
  })
  assert.equal(iq.SELF_SECTIONS[12].association, undefined, 'section 13 has no association')
  const form = read('../src/components/intake/SelfIntakeForm.tsx')
  assert.doesNotMatch(form, /association/, 'the form never renders the association')
})

test('the supplied introduction and question 19 guidance are shown as written', () => {
  assert.deepEqual(iq.SELF_INTRO, doc.intro)
  assert.equal(active[18].note, specQs[18].note)
  assert.deepEqual(active.filter(q => q.note).map(q => q.id), ['emd2_19'])
})

test('response formats follow the document instructions', () => {
  assert.deepEqual(specQs.filter(s => s.response).map(s => s.number), [2, 37, 39, 40])

  // 2: numeric selection from 1 to 10, followed by a written explanation.
  const q2 = active[1]
  assert.equal(specQs[1].response, 'Numeric selection from 1 to 10, followed by a written explanation.')
  assert.equal(q2.type, 'select')
  assert.deepEqual(q2.options, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
  assert.equal(q2.detail.type, 'textarea')
  assert.ok(q2.text.endsWith(q2.detail.text), 'explanation label is the question’s own wording')

  // 37: multiple selections permitted, followed by a written explanation.
  const q37 = active[36]
  assert.equal(specQs[36].response, 'Multiple selections permitted, followed by a written explanation.')
  assert.equal(q37.type, 'multiselect')
  assert.deepEqual(q37.options, ['love', 'relationships', 'family', 'money', 'career', 'purpose', 'karma', 'dharma', 'other'])
  assert.ok(q37.text.includes(q37.options.slice(0, -1).join(', ') + ', or other'), 'options are the areas the question names')
  assert.equal(q37.detail.type, 'textarea')
  assert.ok(q37.text.endsWith(q37.detail.text))

  // 39, 40: selection or written answer; Unknown / Not applicable accepted.
  for (const i of [38, 39]) {
    assert.equal(specQs[i].response, 'Selection or written answer. Unknown / Not applicable accepted.')
    assert.equal(active[i].type, 'text', 'free text with suggested options')
    assert.ok(active[i].options.includes('Unknown / Not applicable'))
  }
  assert.deepEqual(active[38].options.slice(0, 16), MBTI)
  assert.equal(active[39].options.length, 10)

  // All others: written answer.
  active.forEach((q, i) => {
    if ([1, 36, 38, 39].includes(i)) return
    assert.equal(q.type, 'textarea', `question ${i + 1}`)
    assert.equal(q.options, undefined)
    assert.equal(q.detail, undefined)
  })
})

test('every question and every follow-up field is required', () => {
  active.forEach((q, i) => assert.equal(q.required, true, `question ${i + 1}`))
  assert.equal(active[1].detail.required, true)
  assert.equal(active[36].detail.required, true)
})

test('Prefer not to disclose is offered on the sensitive questions only', () => {
  assert.equal(iq.PREFER_NOT_TO_DISCLOSE, 'Prefer not to disclose')
  assert.deepEqual(active.filter(q => q.allowDecline).map(q => q.id),
    ['emd2_08', 'emd2_10', 'emd2_11', 'emd2_12', 'emd2_16', 'emd2_17', 'emd2_19', 'emd2_24'])
})

test('original IDs stay traceable: merges, revisions and new questions', () => {
  specQs.forEach((s, i) => assert.deepEqual(active[i].source, s.source, `question ${s.number}`))
  specQs.forEach((s, i) => {
    const expected = /MERGED/.test(s.tag) ? 'merged' : /REVISED/.test(s.tag) ? 'revised' : undefined
    assert.equal(active[i].revision, expected, `question ${s.number}`)
  })
  assert.deepEqual(active.filter(q => !q.source).map(q => q.id),
    ['emd2_08', 'emd2_10', 'emd2_11', 'emd2_12', 'emd2_20', 'emd2_30', 'emd2_31', 'emd2_32', 'emd2_34', 'emd2_35'])

  const used = active.flatMap(q => q.source ?? [])
  assert.equal(new Set(used).size, used.length, 'each v1 question appears at most once')
  const v1Ids = v1.map(q => q.id)
  assert.equal(v1Ids.length, 38)
  assert.deepEqual([...used].sort(), [...v1Ids].sort(), 'every v1 question maps into v2')
})

test('no obsolete question or ID in the active form', () => {
  const ids = active.flatMap(q => [q.id, q.detail?.id]).filter(Boolean)
  assert.ok(ids.every(id => /^emd2_/.test(id)), 'only versioned IDs are active')
  const activeTexts = new Set(active.map(q => q.text))
  for (const old of v1) {
    // Unchanged wording may only continue under the one question that replaces it
    // (s4 keeps its wording in 37, where only the input format is revised).
    const kept = active.some(q => q.source?.length === 1 && q.source[0] === old.id)
    if (!kept) assert.ok(!activeTexts.has(old.text), `${old.id} wording is not active`)
  }
  assert.deepEqual(iq.getSections('self').flatMap(s => s.questions).map(q => q.id), active.map(q => q.id))
})

test('the v1 form is retained unchanged as the historical record', () => {
  assert.equal(v1.find(q => q.id === 's1').text,
    'Describe yourself, not who you are working to become, but who you actually are at this moment.')
  assert.equal(v1.find(q => q.id === 's36').text,
    'What is your attachment style and how aware are you of it, how does this repeat in your relationships?')
  assert.equal(iq.SELF_SECTIONS_V1[0].title, 'WHO YOU ARE RIGHT NOW')
})

test('no Gene Keys terminology in the questionnaire', () => {
  const words = JSON.stringify({ s: iq.SELF_SECTIONS, i: iq.SELF_INTRO })
  assert.doesNotMatch(words, /gene ?keys?|siddhi|activation sequence|venus sequence|pearl sequence|hologenetic/i)
})

test('other questionnaires are untouched', () => {
  assert.equal(iq.PARENTING_QUESTIONNAIRE_VERSION, 'parenting-v2')
  assert.equal(iq.PARENTING_QUESTION_LIST.length, 50)
  assert.equal(iq.RELATIONAL_QUESTIONNAIRE_VERSION, 'lbd-v2')
  assert.equal(iq.RELATIONAL_QUESTION_LIST.length, 40)
})

// ── Versioning and storage ───────────────────────────────────────────────────

const fullAnswers = () => {
  const a = {}
  for (const q of active) {
    a[q.id] = q.options ? q.options[0] : `answer ${q.id}`
    if (q.detail) a[q.detail.id] = `detail ${q.detail.id}`
  }
  a.emd2_37 = 'love, money'
  return a
}

test('version of a stored intake', () => {
  assert.equal(iq.SELF_QUESTIONNAIRE_VERSION, 'emd-v2')
  assert.equal(iq.SELF_VERSION_KEY, '_questionnaire_version')
  assert.equal(iq.selfIntakeVersion(null), null)
  assert.equal(iq.selfIntakeVersion(undefined), null)
  assert.equal(iq.selfIntakeVersion({}), null)
  assert.equal(iq.selfIntakeVersion({ s1: 'x' }), 'emd-v1')
  assert.equal(iq.selfIntakeVersion({ _questionnaire_version: 'emd-v2', emd2_01: 'x' }), 'emd-v2')
})

test('stored submission: stamped, keys from other versions dropped', () => {
  const stored = iq.toSelfSubmission({ ...fullAnswers(), s1: 'old', _questionnaire_version: 'emd-v1', extra: 'x', emd2_03: 7 })
  assert.equal(stored._questionnaire_version, 'emd-v2')
  assert.equal(stored.emd2_02_explanation, 'detail emd2_02_explanation')
  assert.equal(stored.emd2_37, 'love, money')
  assert.equal(stored.s1, undefined)
  assert.equal(stored.extra, undefined)
  assert.equal(stored.emd2_03, undefined, 'non-string values are not stored')
  assert.equal(Object.keys(stored).length, 39 + 2 + 1, '39 string answers, 2 follow-ups, the stamp')
})

test('required check covers every question and both follow-up fields', () => {
  const a = fullAnswers()
  assert.deepEqual(iq.missingSelfAnswers(a), [])
  delete a.emd2_40
  a.emd2_02_explanation = '  '
  assert.deepEqual(iq.missingSelfAnswers(a), ['emd2_02_explanation', 'emd2_40'])
})

test('validation: 1 to 10 only, listed areas only, any written answer for type questions', () => {
  const a = fullAnswers()
  for (const v of ['0', '11', 'seven', '7.5']) {
    assert.deepEqual(iq.missingSelfAnswers({ ...a, emd2_02: v }), ['emd2_02'], v)
  }
  assert.deepEqual(iq.missingSelfAnswers({ ...a, emd2_02: '10' }), [])
  assert.deepEqual(iq.missingSelfAnswers({ ...a, emd2_37: 'love, travel' }), ['emd2_37'])
  assert.deepEqual(iq.missingSelfAnswers({ ...a, emd2_37: 'karma, dharma, other' }), [])
  assert.deepEqual(iq.missingSelfAnswers({ ...a, emd2_39: 'Unknown / Not applicable', emd2_40: '4w5, written' }), [])
  assert.deepEqual(iq.missingSelfAnswers({ ...a, emd2_10: 'Prefer not to disclose' }), [])
})

test('multiple selections are stored in option order and read back', () => {
  const q37 = active[36]
  assert.equal(iq.joinMulti(q37, ['money', 'love', 'nope']), 'love, money')
  assert.deepEqual(iq.splitMulti('love, money'), ['love', 'money'])
  assert.deepEqual(iq.splitMulti(''), [])
})

test('resume starts at the first unanswered question', () => {
  const a = fullAnswers()
  assert.equal(iq.firstUnansweredSelfIndex(a), -1)
  delete a.emd2_30
  delete a.emd2_37_explanation
  assert.equal(iq.firstUnansweredSelfIndex(a), 29)
  a.emd2_30 = 'x'
  assert.equal(iq.firstUnansweredSelfIndex(a), 36)
})

// ── Interpretation payload ───────────────────────────────────────────────────

test('engine receives all 40 questions, each answer beside its own wording', () => {
  const p = iq.buildSelfIntakePayload(iq.toSelfSubmission(fullAnswers()))
  assert.equal(p.questionnaire_version, 'emd-v2')
  assert.equal(p.responses.length, 40)
  p.responses.forEach((r, i) => {
    const sec = spec.find(s => s.questions.includes(specQs[i]))
    assert.equal(r.number, i + 1)
    assert.equal(r.id, active[i].id)
    assert.equal(r.question, specQs[i].text)
    assert.equal(r.section, sec.title)
    assert.equal(r.section_association, sec.association)
    assert.deepEqual(r.source_ids, specQs[i].source)
    assert.equal(r.answer, fullAnswers()[active[i].id])
  })
  assert.deepEqual(p.responses[1].detail, { id: 'emd2_02_explanation', question: 'Explain why you chose that number.', answer: 'detail emd2_02_explanation' })
  assert.deepEqual(p.responses[36].detail, { id: 'emd2_37_explanation', question: 'If so, why?', answer: 'detail emd2_37_explanation' })
  assert.equal(p.responses[18].note, specQs[18].note)
  assert.ok(!JSON.stringify(p).includes('_questionnaire_version'), 'stamp is not repeated as an answer')
})

test('an unanswered question reaches the engine as null, never omitted', () => {
  const a = fullAnswers(); delete a.emd2_15
  const p = iq.buildSelfIntakePayload(iq.toSelfSubmission(a))
  assert.equal(p.responses[14].answer, null)
  assert.equal(p.responses.length, 40)
})

test('a v1 intake is read with v1 wording, never remapped to v2', () => {
  const p = iq.buildSelfIntakePayload({ s1: 'v1 answer', s36: 'secure' })
  assert.equal(p.questionnaire_version, 'emd-v1')
  assert.equal(p.responses.length, 38)
  assert.equal(p.responses.find(r => r.id === 's36').answer, 'secure')
  assert.equal(p.responses.find(r => r.id === 's36').question, v1.find(q => q.id === 's36').text)
  assert.ok(p.responses.every(r => !r.id.startsWith('emd2_')))
  assert.equal(iq.buildSelfIntakePayload(null), null)
})

test('an unknown version passes through untouched', () => {
  const p = iq.buildSelfIntakePayload({ _questionnaire_version: 'emd-v9', x: 'y' })
  assert.equal(p.questionnaire_version, 'emd-v9')
  assert.equal(p.answers.x, 'y')
})

// ── Routes and form wiring (source checks) ───────────────────────────────────

test('autosave refuses to replace a submitted or earlier-version intake', () => {
  const src = read('../src/app/api/autosave-self-intake/route.ts')
  assert.match(src, /chart\.user_id !== user\.id/)
  assert.match(src, /intake_self_complete === true\) return NextResponse\.json\([^)]*\{ status: 409 \}/)
  assert.match(src, /storedVersion !== SELF_QUESTIONNAIRE_VERSION/)
  assert.match(src, /update\(\{ intake_self: toSelfSubmission\(answers\) \}\)/)
})

test('final submit: same guards, required check, stamped write', () => {
  const src = read('../src/app/api/save-intake/route.ts')
  const branch = src.slice(src.indexOf("if (formType === 'self')"), src.indexOf("if (formType === 'relational')"))
  assert.match(branch, /intake_self_complete === true\) \{\s*return NextResponse\.json\([^)]*\{ status: 409 \}/)
  assert.match(branch, /storedVersion !== SELF_QUESTIONNAIRE_VERSION/)
  assert.match(branch, /missingSelfAnswers\(answers\)\.length > 0\) \{\s*return NextResponse\.json\([^)]*\{ status: 400 \}/)
  assert.match(branch, /intake_self: toSelfSubmission\(answers\), intake_self_complete: true/)
})

test('astrology, d-chart, combined and HD generation send the structured intake', () => {
  for (const file of ['../src/app/api/interpret/route.ts', '../src/app/api/interpret-hd/route.ts']) {
    const src = read(file)
    assert.match(src, /const intake = buildSelfIntakePayload\(chart\.intake_self\)/, file)
    assert.doesNotMatch(src, /chart\.intake_self as/, file)
  }
  const interpret = read('../src/app/api/interpret/route.ts')
  assert.match(interpret, /callBackendInterpret\('\/interpret\/natal', \{ birth, section: column, intake \}\)/)
  assert.match(interpret, /if \(intake\)\s+payload\.intake = intake/)
})

test('a fully answered but unsubmitted intake reopens on the last question, not the confirmation', () => {
  const form = readFileSync(new URL('../src/components/intake/SelfIntakeForm.tsx', import.meta.url), 'utf8')
  assert.match(form, /return firstUnanswered === -1 \? TOTAL : firstUnanswered \+ 1/)
})

test('form derives its length from the definitions and wires every response type', () => {
  const src = read('../src/components/intake/SelfIntakeForm.tsx')
  assert.doesNotMatch(src, /\b38\b/, 'no hardcoded v1 step counts')
  assert.match(src, /const TOTAL\s+= SELF_QUESTION_LIST\.length/)
  assert.match(src, /question\.type === 'select' && question\.options/)
  assert.match(src, /question\.type === 'multiselect' && question\.options/)
  assert.match(src, /<datalist/)
  assert.match(src, /q\.allowDecline &&/)
  assert.match(src, /<AnswerField key=\{q\.detail\.id\} question=\{q\.detail\}/)
  assert.match(src, /isSelfQuestionAnswered\(q, answers\)/)
  assert.match(src, /version !== SELF_QUESTIONNAIRE_VERSION\) return LEGACY_STEP/)
  assert.match(src, /await autosave\(chartId, updatedAnswers\)/)
})
