// Run: npm test
// Loving By Design v2 (40 questions, 9 sections) against the owner's supplied
// draft, kept verbatim in tests/fixtures/loving-by-design-v2.spec.txt. The
// TypeScript source is transpiled in memory with the project's own typescript package.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const read = rel => readFileSync(new URL(rel, import.meta.url), 'utf8')
const js = ts.transpileModule(read('../src/lib/intake-questions.ts'),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const iq = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))
const src = rel => read('../src/' + rel)

// ── The supplied draft, parsed line by line ──────────────────────────────────

function parseSpec(text) {
  const sections = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    let m
    if ((m = line.match(/^(SECTION \d+ — .+)$/))) { sections.push({ title: m[1], questions: [] }); continue }
    if ((m = line.match(/^(\d+)\. \[([^\]]+)\] (.+)$/))) {
      sections.at(-1).questions.push({ number: Number(m[1]), tag: m[2], source: m[2].match(/r\d+/g) ?? undefined, text: m[3] })
      continue
    }
    if (sections.length) throw new Error('Unparsed spec line: ' + line)
  }
  return sections
}

const spec = parseSpec(read('./fixtures/loving-by-design-v2.spec.txt'))
const specQs = spec.flatMap(s => s.questions)
const active = iq.RELATIONAL_QUESTION_LIST
const v1 = iq.RELATIONAL_SECTIONS_V1.flatMap(s => s.questions)
const pad = n => String(n).padStart(2, '0')

// ── Definitions ──────────────────────────────────────────────────────────────

test('exactly 40 active questions, numbered 1 to 40 in the draft order', () => {
  assert.equal(specQs.length, 40)
  assert.deepEqual(specQs.map(q => q.number), Array.from({ length: 40 }, (_, i) => i + 1))
  assert.equal(active.length, 40)
  assert.deepEqual(active.map(q => q.id), specQs.map(q => `lbd2_${pad(q.number)}`))
})

test('every question matches the supplied wording character for character', () => {
  specQs.forEach((s, i) => assert.equal(active[i].text, s.text, `question ${s.number}`))
  assert.ok(active[15].text.includes('partner’s responses'), 'curly apostrophe kept in question 16')
})

test('nine sections with the supplied headings, in order, holding the supplied questions', () => {
  assert.equal(spec.length, 9)
  assert.deepEqual(iq.RELATIONAL_SECTIONS.map(s => s.title), spec.map(s => s.title))
  iq.RELATIONAL_SECTIONS.forEach((s, i) =>
    assert.deepEqual(s.questions.map(q => q.text), spec[i].questions.map(q => q.text), s.title))
})

test('no duplicate IDs or wording', () => {
  assert.equal(new Set(active.map(q => q.id)).size, 40)
  assert.equal(new Set(active.map(q => q.text)).size, 40)
})

test('existing response type only: every question is a required textarea', () => {
  active.forEach(q => {
    assert.equal(q.type, 'textarea', q.id)
    assert.equal(q.required, true, q.id)
    assert.equal(q.options, undefined, q.id)
    assert.equal(q.detail, undefined, q.id)
  })
})

// Corrected content mapping (v2 question number -> v1 source IDs, match).
const MAPPING = {
  1: [['r29'], 'direct'], 2: [['r27'], 'partial'], 3: [['r27'], 'partial'], 4: [['r28'], 'partial'],
  7: [['r1', 'r2'], 'direct'], 8: [['r6'], 'direct'], 9: [['r7', 'r26'], 'direct'], 10: [['r8', 'r9'], 'direct'],
  11: [['r21'], 'partial'], 12: [['r18'], 'direct'], 13: [['r37'], 'partial'], 14: [['r10', 'r13'], 'direct'],
  15: [['r17'], 'partial'], 16: [['r11'], 'direct'], 18: [['r16', 'r17'], 'direct'], 19: [['r20'], 'partial'],
  22: [['r15'], 'partial'], 25: [['r19', 'r24'], 'direct'], 26: [['r22', 'r23'], 'direct'], 28: [['r12'], 'partial'],
  29: [['r28'], 'partial'], 30: [['r32'], 'direct'], 32: [['r33'], 'direct'], 34: [['r31'], 'partial'],
  37: [['r36'], 'direct'], 38: [['r34'], 'partial'], 40: [['r41', 'r42'], 'direct'],
}

test('corrected v1 sources: content mapping, merges flagged, new questions have no source', () => {
  active.forEach((q, i) => {
    const m = MAPPING[i + 1]
    assert.deepEqual(q.source, m?.[0], `question ${i + 1} source`)
    assert.equal(q.match, m?.[1], `question ${i + 1} match`)
    assert.equal(q.revision, m && m[0].length > 1 ? 'merged' : undefined, `question ${i + 1} revision`)
  })
  assert.equal(active.filter(q => !q.source).length, 13, 'thirteen new questions')
})

test('the supplied draft tags are kept verbatim as provenance, separate from source', () => {
  specQs.forEach((s, i) => assert.equal(active[i].draftTag, s.tag, `question ${s.number}`))
  assert.equal(active[9].draftTag, 'r10 + r13 MERGED')
  assert.notDeepEqual(active[9].source, ['r10', 'r13'], 'draft tag is not the corrected source')
})

test('every v1 ID is either a source or listed as retired, never both', () => {
  const sourced = new Set(active.flatMap(q => q.source ?? []))
  const retired = iq.RELATIONAL_V1_RETIRED
  retired.forEach(id => assert.ok(!sourced.has(id), id))
  assert.deepEqual([...sourced, ...retired].sort(), v1.map(q => q.id).sort())
})

test('no v1 ID is active', () => {
  active.forEach(q => assert.doesNotMatch(q.id, /^r\d+$/, q.id))
})

test('the v1 form is retained unchanged as the historical record', () => {
  assert.equal(v1.length, 42)
  assert.deepEqual(v1.map(q => q.id), Array.from({ length: 42 }, (_, i) => `r${i + 1}`))
  assert.equal(v1[0].text.startsWith('How did you and your partner meet'), true)
})

test('partner birth section unchanged and shown only to Partner A', () => {
  assert.deepEqual(iq.RELATIONAL_PERSON_B_SECTION.questions.map(q => q.id),
    ['r_name', 'r_date', 'r_time', 'r_city', 'r_state', 'r_country', 'r_time_known'])
  assert.equal(iq.getRelationalSections()[0], iq.RELATIONAL_PERSON_B_SECTION)
  assert.equal(iq.getRelationalSections().length, 10)
})

test('other questionnaires are untouched', () => {
  assert.equal(iq.SELF_QUESTION_LIST.length, 40)
  assert.equal(iq.SELF_QUESTION_LIST[0].id, 'emd2_01')
  assert.equal(iq.PARENTING_QUESTIONNAIRE_VERSION, 'parenting-v2')
  assert.equal(iq.PARENTING_QUESTION_LIST.length, 50)
})

// ── Versioning and storage ───────────────────────────────────────────────────

const fullAnswers = () => Object.fromEntries(active.map(q => [q.id, `answer ${q.id}`]))
const birth = { r_name: 'B', r_date: '2000-01-01', r_time: '12:00', r_city: 'X', r_state: '', r_country: 'Y' }

test('version of a stored intake', () => {
  assert.equal(iq.relationalIntakeVersion(null), null)
  assert.equal(iq.relationalIntakeVersion({}), null)
  assert.equal(iq.relationalIntakeVersion(birth), null, 'birth data alone is not an answered version')
  assert.equal(iq.relationalIntakeVersion({ r1: 'x' }), 'lbd-v1', 'unstamped answers are v1')
  assert.equal(iq.relationalIntakeVersion({ _questionnaire_version: 'lbd-v2' }), 'lbd-v2')
})

test('Partner A submission: v2 answers and birth data, stamped, v1 keys dropped', () => {
  const out = iq.toRelationalSubmission({ ...fullAnswers(), ...birth, r1: 'old', stray: 'x', lbd2_01: 5 }, true)
  assert.equal(out._questionnaire_version, 'lbd-v2')
  assert.equal(out.r1, undefined)
  assert.equal(out.stray, undefined)
  assert.equal(out.lbd2_01, undefined, 'non-string dropped')
  assert.equal(out.lbd2_40, 'answer lbd2_40')
  assert.equal(out.r_name, 'B')
})

test('Partner B submission never carries birth fields', () => {
  const out = iq.toRelationalSubmission({ ...fullAnswers(), ...birth }, false)
  Object.keys(birth).forEach(k => assert.equal(out[k], undefined, k))
  assert.equal(Object.keys(out).length, 41)
})

test('required check, missing list and resume point', () => {
  const a = fullAnswers()
  assert.deepEqual(iq.missingRelationalAnswers(a), [])
  assert.equal(iq.firstUnansweredRelationalIndex(a), -1)
  a.lbd2_21 = '   '
  delete a.lbd2_33
  assert.deepEqual(iq.missingRelationalAnswers(a), ['lbd2_21', 'lbd2_33'])
  assert.equal(iq.firstUnansweredRelationalIndex(a), 20)
  assert.equal(iq.isRelationalQuestionAnswered(active[20], a), false)
  assert.equal(iq.firstUnansweredRelationalIndex({}), 0)
})

// ── Interpretation mapping ───────────────────────────────────────────────────

test('one partner payload: all 40 questions with wording, section and answer', () => {
  const p = iq.buildRelationalIntakePayload(iq.toRelationalSubmission({ ...fullAnswers(), ...birth }, true), true)
  assert.equal(p.questionnaire_version, 'lbd-v2')
  assert.equal(p.responses.length, 40)
  p.responses.forEach((r, i) => {
    assert.equal(r.number, i + 1)
    assert.equal(r.question, specQs[i].text)
    assert.equal(r.answer, `answer lbd2_${pad(i + 1)}`)
  })
  assert.equal(p.responses[0].section, spec[0].title)
  assert.deepEqual(p.responses[9].source_ids, ['r8', 'r9'])
  assert.equal('source_ids' in p.responses[20], false)
  assert.equal(p.partner_birth_details.r_name, 'B')
})

test('an unanswered question is null; a v1 intake keeps v1 wording', () => {
  const p = iq.buildRelationalIntakePayload({ _questionnaire_version: 'lbd-v2', lbd2_01: 'a' }, false)
  assert.equal(p.responses[1].answer, null)
  assert.equal('partner_birth_details' in p, false)
  const old = iq.buildRelationalIntakePayload({ r1: 'met at work' }, false)
  assert.equal(old.questionnaire_version, 'lbd-v1')
  assert.equal(old.responses.length, 42)
  assert.equal(old.responses[0].question, v1[0].text)
  assert.equal(old.responses[0].answer, 'met at work')
})

test('pair payload: person_a is the purchaser, person_b the partner, only once both submitted', () => {
  const a = { intake_relational_complete: true, intake_relational: { ...iq.toRelationalSubmission({ ...fullAnswers(), ...birth }, true) } }
  const bAnswers = iq.toRelationalSubmission(Object.fromEntries(active.map(q => [q.id, `B ${q.id}`])), false)
  const pair = iq.buildPairIntakePayload(a, bAnswers)
  assert.equal(pair.person_a.responses[0].answer, 'answer lbd2_01')
  assert.equal(pair.person_b.responses[0].answer, 'B lbd2_01')
  assert.ok(pair.person_a.partner_birth_details)
  assert.equal('partner_birth_details' in pair.person_b, false)

  assert.equal(iq.buildPairIntakePayload(a, null), null, 'partner not submitted: nothing')
  assert.equal(iq.buildPairIntakePayload({ intake_relational: a.intake_relational }, bAnswers), null, 'purchaser not submitted: nothing')
})

test('synastry and HD composite refuse to generate until both partners submit', () => {
  for (const f of ['interpret-synastry', 'interpret-composite']) {
    const s = src(`app/api/${f}/route.ts`)
    assert.match(s, /const partnerAnswers = await loadSubmittedPartnerAnswers\(createAdminClient\(\), String\(partner\.id\)\)/, f)
    assert.match(s, /const intake = buildPairIntakePayload\(self, partnerAnswers\)/, f)
    assert.match(s, /if \(!intake\) return jsonError\('Both partners must submit their intake before the reading is generated', 409\)/, f)
    assert.match(s, /const intakeA = intake\.person_a/, f)
    assert.match(s, /payload\.intake = intake/, f)
    assert.match(s, /Person B's intake answers inform the reading but stay confidential/, f)
    assert.doesNotMatch(s, /partner\.intake_relational/, f)
  }
})

test('product clients start generation only once the partner has submitted', () => {
  for (const f of ['app/products/synastry/SynastryProductClient.tsx', 'app/products/hd-composite/HdCompositeProductClient.tsx']) {
    const s = src(f)
    assert.match(s, /if \(!intakeComplete \|\| !partnerChartReady \|\| !partnerIntakeComplete\) return/, f)
    assert.match(s, /Your reading generates after your partner submits theirs\./, f)
  }
  for (const f of ['app/products/synastry/page.tsx', 'app/products/hd-composite/page.tsx']) {
    assert.match(src(f), /partnerIntakeComplete=\{partnerIntakeComplete\}/, f)
    assert.match(src(f), /await partnerIntakeSubmitted\(/, f)
  }
})

// ── Routes: partner separation and guards ────────────────────────────────────

test('Partner A autosave cannot reach a partner or child row, a submitted or older intake', () => {
  const s = src('app/api/autosave-intake/route.ts')
  assert.match(s, /chart\.chart_label === 'partner' \|\| chart\.chart_label === 'child'/)
  assert.match(s, /intake_relational_complete === true\) return NextResponse\.json\(\{ error: 'Intake already submitted' \}, \{ status: 409 \}\)/)
  assert.match(s, /relationalIntakeVersion\(chart\.intake_relational\)/)
  assert.match(s, /toRelationalSubmission\(answers, true\)/)
})

test('Partner A final submit: label, completion, version and required guards; stamped write', () => {
  const s = src('app/api/save-intake/route.ts')
  const branch = s.slice(s.indexOf("if (formType === 'relational')"))
  assert.match(branch, /current\?\.chart_label === 'partner' \|\| current\?\.chart_label === 'child'/)
  assert.match(branch, /current\?\.intake_relational_complete === true/)
  assert.match(branch, /relationalIntakeVersion\(current\?\.intake_relational\)/)
  assert.match(branch, /missingRelationalAnswers\(answers\)/)
  assert.match(branch, /intake_relational: toRelationalSubmission\(answers, true\)/)
})

test('Partner B answers live only in the locked table, never on the partner chart row', () => {
  const save = src('app/api/partner-intake/save/route.ts')
  const session = src('app/api/partner-intake/session/route.ts')
  for (const s of [save, session]) {
    assert.doesNotMatch(s, /intake_relational/)
    assert.match(s, /PARTNER_INTAKE_TABLE/)
  }
  assert.match(save, /answers:\s+toRelationalSubmission\(answers, false\)/)
  assert.match(save, /missingRelationalAnswers/)
  assert.match(save, /\.eq\('claim_hash', intake\.claim_hash\)\s*\.eq\('complete', false\)/)
  assert.doesNotMatch(save, /body\.token|token\b.*=.*body/, 'the link token alone cannot write')
  assert.match(save, /partner_intake_token_hash: null/, 'submit retires the link')
  assert.match(session, /chart\.chart_label !== 'partner'/)
  assert.match(session, /partnerTokenValid\(body\.token/)
  assert.match(session, /'23505'/, 'a concurrent first open loses')
  assert.match(session, /toRelationalSubmission\(\(intake\.answers/, 'returns only the partner\'s own answer keys')
  assert.throws(() => src('app/api/save-partner-intake/route.ts'), 'old route that wrote to charts is gone')
})

test('migration: locked table, RLS on, no policies, no client grants; not applied by code', () => {
  const m = read('../supabase/migrations/20261104_partner_relational_intakes.sql')
  assert.match(m, /CREATE TABLE IF NOT EXISTS public\.partner_relational_intakes/)
  assert.match(m, /ENABLE ROW LEVEL SECURITY/)
  assert.match(m, /REVOKE ALL ON public\.partner_relational_intakes FROM anon, authenticated/)
  assert.doesNotMatch(m, /CREATE POLICY/i)
  assert.match(m, /claim_hash\s+text\s+NOT NULL/)
})

const claim = await import('data:text/javascript;base64,' + Buffer.from(ts.transpileModule(src('lib/partner-intake-claim.ts'),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64'))

test('claim secret: random, hash-only storage, constant-time check', () => {
  const { secret, hash } = claim.mintPartnerClaim()
  assert.equal(hash.length, 64)
  assert.notEqual(hash, secret)
  assert.equal(claim.partnerClaimValid(secret, hash), true)
  assert.equal(claim.partnerClaimValid(secret + 'x', hash), false)
  assert.equal(claim.partnerClaimValid(claim.mintPartnerClaim().secret, hash), false)
  assert.equal(claim.partnerClaimValid(undefined, hash), false)
  assert.equal(claim.partnerClaimValid(secret, null), false)
  assert.equal(claim.partnerClaimValid('short', hash), false)
})

test('claim cookie: httpOnly, Secure, SameSite=strict, scoped to the partner API, per partner chart', () => {
  const o = claim.partnerClaimCookieOptions('2030-01-01T00:00:00Z')
  assert.equal(o.httpOnly, true)
  assert.equal(o.secure, true)
  assert.equal(o.sameSite, 'strict')
  assert.equal(o.path, '/api/partner-intake')
  const id = '0f8fad5b-d9cb-469f-a165-70867728950e'
  assert.equal(claim.isPartnerChartId(id), true)
  assert.equal(claim.isPartnerChartId('x; Path=/'), false)
  assert.equal(claim.partnerClaimCookieName(id), `mp_partner_claim_${id}`)
})

test('partner form resumes through the session route and shows the independence line', () => {
  const b = src('components/intake/PartnerIntakeForm.tsx')
  assert.match(b, /fetch\('\/api\/partner-intake\/session'/)
  assert.match(b, /fetch\('\/api\/partner-intake\/save'/)
  assert.doesNotMatch(b, /JSON\.stringify\(\{ partner_chart_id: partnerChartId, token, answers/, 'token not sent on save')
  assert.match(b, /\{RELATIONAL_INDEPENDENT_COMPLETION\}/)
  assert.match(src('components/intake/RelationalIntakeForm.tsx'), /\{RELATIONAL_INDEPENDENT_COMPLETION\}/)
  assert.equal(iq.RELATIONAL_INDEPENDENT_COMPLETION, read('./fixtures/loving-by-design-v2.spec.txt').split('\n').map(l => l.trim()).find(l => l.startsWith('Each partner completes')))
})

test('product pages send only the partner chart id to the browser', () => {
  for (const f of ['app/products/synastry/page.tsx', 'app/products/hd-composite/page.tsx']) {
    const s = src(f)
    const partnerSelects = [...s.matchAll(/\.from\('charts'\)\s*\.select\('([^']+)'\)\s*\.eq\('(id|user_id)'[^)]*\)\s*\.eq\('chart_label', 'partner'\)|\.from\('charts'\)\s*\.select\('([^']+)'\)\s*\.eq\('id', chart\.partner_chart_id/g)]
    assert.equal(partnerSelects.length, 2, f)
    partnerSelects.forEach(m => assert.equal(m[1] ?? m[3], 'id', f))
  }
  for (const f of ['app/products/synastry/SynastryProductClient.tsx', 'app/products/hd-composite/HdCompositeProductClient.tsx']) {
    assert.doesNotMatch(src(f), /chart_label', 'partner'\)[^\n]*select\('\*'\)|select\('\*'\)[^\n]*chart_label', 'partner'/, f)
  }
})

test('forms derive length from the definitions; no hard-coded 42 or 43', () => {
  const a = src('components/intake/RelationalIntakeForm.tsx')
  assert.match(a, /const TOTAL\s+= RELATIONAL_QUESTION_LIST\.length/)
  assert.match(a, /firstUnansweredRelationalIndex/)
  assert.match(a, /LEGACY_STEP/)
  assert.doesNotMatch(a, /\b4[23]\b/)
  assert.doesNotMatch(src('components/intake/PartnerIntakeForm.tsx'), /\b4[23]\b/)
})

test('both relationship forms use the approved heading from the source document', () => {
  const heading = read('./fixtures/loving-by-design-v2.spec.txt').split('\n').map(l => l.trim()).find(l => /Intake Questionnaire$/.test(l))
  assert.equal(heading, 'Relationship Intake Questionnaire')
  for (const f of ['PartnerIntakeForm', 'RelationalIntakeForm']) {
    const body = src(`components/intake/${f}.tsx`)
    assert.match(body, new RegExp(`>${heading}</h1>`))
    assert.doesNotMatch(body, /Relational Intake Form/)
  }
})
