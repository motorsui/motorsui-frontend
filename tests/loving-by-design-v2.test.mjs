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
    assert.match(s, /if \(!readingsAvailable \|\| !intakeComplete \|\| !partnerChartReady \|\| !partnerIntakeComplete\) return/, f)
    assert.match(s, /\{!partnerIntakeComplete && <PartnerInvitePanel \/>\}/, f)
  }
  assert.match(src('components/intake/PartnerInvitePanel.tsx'), /Your reading generates after your partner submits theirs\./)
  for (const f of ['app/products/synastry/page.tsx', 'app/products/hd-composite/page.tsx']) {
    assert.match(src(f), /partnerIntakeComplete=\{partnerIntakeComplete\}/, f)
    assert.match(src(f), /await partnerIntakeSubmitted\(/, f)
    assert.match(src(f), /readingsAvailable=\{LOVING_BY_DESIGN_READINGS_AVAILABLE\}/, f)
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
    assert.match(s, /const partner = await verifiedPartner\(\)\n\s+if \('response' in partner\) return partner\.response/, 'email-verified session required')
    assert.doesNotMatch(s, /token/i, 'no link token is accepted')
  }
  assert.match(save, /answers:\s+toRelationalSubmission\(answers, false\)/)
  assert.match(save, /missingRelationalAnswers/)
  assert.match(save, /invitationActive\(invitation\) \|\| invitation\.invitee_email !== email \|\| invitation\.purchaser_user_id === user\.id/)
  assert.match(save, /intake\.partner_user_id !== user\.id/)
  assert.match(save, /\.eq\('partner_user_id', user\.id\)\s*\.eq\('complete', false\)/)
  assert.match(session, /filter\(inv => inv\.purchaser_user_id !== user\.id\)/, 'the purchaser can never open the partner form')
  assert.match(session, /partner_user_id:\s+user\.id/)
  assert.match(session, /'23505'/, 'a concurrent first open loses')
  assert.match(session, /intake\.partner_user_id !== user\.id/)
  assert.match(session, /toRelationalSubmission\(\(intake\.answers/, 'returns only the partner\'s own answer keys')
  assert.throws(() => src('app/api/save-partner-intake/route.ts'), 'old route that wrote to charts is gone')
  assert.throws(() => src('lib/partner-intake-token.ts'), 'share-link token is gone')
  assert.throws(() => src('lib/partner-intake-claim.ts'), 'first-opener claim is gone')
  assert.doesNotMatch(src('app/api/save-intake/route.ts'), /partner_intake_path|partner_intake_token/)
})

test('migration: locked tables, RLS on, no policies, no client grants, binding and completion enforced in the database', () => {
  const m = read('../supabase/migrations/20261104_partner_relational_intakes.sql')
  for (const t of ['partner_invitations', 'partner_relational_intakes', 'partner_access_events']) {
    assert.match(m, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${t}`))
    assert.match(m, new RegExp(`ALTER TABLE public\\.${t}\\s+ENABLE ROW LEVEL SECURITY`))
    assert.match(m, new RegExp(`REVOKE ALL ON public\\.${t}\\s+FROM anon, authenticated`))
  }
  assert.doesNotMatch(m, /CREATE POLICY/i)
  assert.match(m, /partner_user_id\s+uuid\s+NOT NULL/)
  assert.match(m, /CREATE UNIQUE INDEX IF NOT EXISTS partner_invitations_one_active/)
  assert.match(m, /CREATE TRIGGER partner_relational_intakes_guard/)
  assert.doesNotMatch(m.replace('DROP TRIGGER IF EXISTS partner_relational_intakes_guard ON public.partner_relational_intakes;', ''), /DROP |TRUNCATE|DELETE FROM|ALTER TABLE public\.(charts|profiles)/i, 'additive only')
})

const access = await import('data:text/javascript;base64,' + Buffer.from(ts.transpileModule(src('lib/partner-access.ts'),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64'))

test('partner links return only to the MotorSui app, never the Site URL fallback', () => {
  const h = host => new Headers(host ? { host } : {})
  assert.equal(access.partnerRedirectUrl(h('charts.motorsui.com')), 'https://charts.motorsui.com/intake/partner')
  assert.equal(access.partnerRedirectUrl(h('motorsui-frontend-production.up.railway.app')), 'https://charts.motorsui.com/intake/partner')
  assert.equal(access.partnerRedirectUrl(h('evil.example')), 'https://charts.motorsui.com/intake/partner')
  assert.equal(access.partnerRedirectUrl(h(null)), 'https://charts.motorsui.com/intake/partner')
  assert.equal(access.partnerRedirectUrl(h('localhost:3000')), 'http://localhost:3000/intake/partner')
})

test('only a confirmed email-link session counts as Partner B', () => {
  const user = { email: 'b@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' }
  assert.equal(access.emailLinkSession(user, [{ method: 'otp', timestamp: 1 }]), true)
  assert.equal(access.emailLinkSession(user, ['magiclink']), true)
  assert.equal(access.emailLinkSession(user, [{ method: 'password', timestamp: 1 }]), false, 'password sign-in refused')
  assert.equal(access.emailLinkSession(user, [{ method: 'otp' }, { method: 'password' }]), false)
  assert.equal(access.emailLinkSession(user, [{ method: 'oauth' }]), false)
  assert.equal(access.emailLinkSession(user, []), false)
  assert.equal(access.emailLinkSession(user, undefined), false)
  assert.equal(access.emailLinkSession({ ...user, email_confirmed_at: undefined }, [{ method: 'otp' }]), false)
  assert.equal(access.emailLinkSession(null, [{ method: 'otp' }]), false)
})

test('invitations: email normalised, expiry and revocation end access', () => {
  assert.equal(access.normalizeEmail('  B@Example.COM '), 'b@example.com')
  assert.equal(access.normalizeEmail('not-an-email'), null)
  assert.equal(access.normalizeEmail('a@b.c'.padStart(300, 'x')), null)
  assert.equal(access.normalizeEmail(42), null)
  const now = Date.parse('2026-06-01T00:00:00Z')
  assert.equal(access.invitationActive({ revoked_at: null, expires_at: '2026-06-02T00:00:00Z' }, now), true)
  assert.equal(access.invitationActive({ revoked_at: null, expires_at: '2026-05-31T00:00:00Z' }, now), false)
  assert.equal(access.invitationActive({ revoked_at: '2026-05-01T00:00:00Z', expires_at: '2026-06-02T00:00:00Z' }, now), false)
  assert.equal(access.invitationActive(null, now), false)
  assert.equal(access.isUuid('0f8fad5b-d9cb-469f-a165-70867728950e'), true)
  assert.equal(access.isUuid("x' or 1=1"), false)
})

test('invite and recovery routes: no link or token reaches the purchaser; rate limited; no address probing', () => {
  const invite = src('app/api/partner-invite/route.ts')
  assert.doesNotMatch(invite, /access_token|action_link|generateLink/)
  assert.match(invite, /email === ctx\.ownEmail/)
  assert.match(invite, /startedBy !== null && startedBy !== email/, 'reissue never moves the questionnaire to another address')
  assert.match(invite, /if \(submitted\) return/)
  assert.match(invite, /rateLimited\(ctx\.admin, 'invite', ctx\.userId, 5, HOUR\)/)
  const acc = src('app/api/partner-intake/access/route.ts')
  assert.match(acc, /rateLimited\(admin, 'access-ip'/)
  assert.match(acc, /rateLimited\(admin, 'access-email', email, 3, HOUR\)/)
  assert.equal((acc.match(/return NextResponse\.json\(\{ message: SENT \}\)/g) ?? []).length, 1, 'one reply whether or not the address is invited')
  for (const f of ['app/api/partner-invite/route.ts', 'app/api/partner-intake/access/route.ts', 'lib/partner-access.ts', 'app/api/partner-intake/session/route.ts', 'app/api/partner-intake/save/route.ts']) {
    for (const line of src(f).split('\n').filter(l => /console\.(log|error|warn)/.test(l))) {
      assert.doesNotMatch(line, /email|answers|token|redirect/i, `${f}: ${line.trim()}`)
    }
  }
})

test('partner form signs in from the email link and resumes through the session route', () => {
  const b = src('components/intake/PartnerIntakeForm.tsx')
  assert.match(b, /auth\.setSession\(\{ access_token, refresh_token \}\)/)
  assert.match(b, /window\.history\.replaceState\(null, '', window\.location\.pathname\)/, 'fragment cleared')
  assert.match(b, /fetch\('\/api\/partner-intake\/session'/)
  assert.match(b, /fetch\('\/api\/partner-intake\/save'/)
  assert.match(b, /fetch\('\/api\/partner-intake\/access'/)
  assert.match(b, /JSON\.stringify\(\{ invitation_id: invitationId, answers, complete \}\)/)
  assert.match(b, /\{RELATIONAL_INDEPENDENT_COMPLETION\}/)
  assert.match(src('components/intake/RelationalIntakeForm.tsx'), /\{RELATIONAL_INDEPENDENT_COMPLETION\}/)
  assert.equal(iq.RELATIONAL_INDEPENDENT_COMPLETION, read('./fixtures/loving-by-design-v2.spec.txt').split('\n').map(l => l.trim()).find(l => l.startsWith('Each partner completes')))
  assert.doesNotMatch(src('app/intake/partner/page.tsx'), /searchParams|get\('t'\)/)
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

test('Loving By Design pages and routes are gated by the availability switch', () => {
  const avail = src('lib/product-availability.ts')
  assert.match(avail, /export const LOVING_BY_DESIGN_AVAILABLE = (true|false)\n/)
  assert.match(avail, /\['synastry_report', 'hd_composite_report'\]/)
  const gate = /const closed = lovingByDesignClosed\(\)\n\s+if \(closed\) return closed\n/
  for (const [f, handlers] of [
    ['app/api/autosave-intake/route.ts', 1], ['app/api/partner-intake/session/route.ts', 1], ['app/api/partner-intake/save/route.ts', 1],
    ['app/api/partner-intake/access/route.ts', 1], ['app/api/partner-invite/route.ts', 3],
    ['app/api/interpret-synastry/route.ts', 2], ['app/api/interpret-composite/route.ts', 2],
  ]) {
    const body = src(f)
    const found = body.split(/^export async function /m).slice(1).filter(h => gate.test(h.split('\n').slice(0, 4).join('\n') + '\n')).length
    assert.equal(found, handlers, `${f}: every handler starts with the gate`)
  }
  assert.match(src('app/api/save-intake/route.ts'), /if \(formType === 'relational'\) \{\n\s+const closed = lovingByDesignClosed\(\)\n\s+if \(closed\) return closed\n/)
  for (const f of ['app/products/synastry/page.tsx', 'app/products/hd-composite/page.tsx']) {
    assert.match(src(f), /if \(!user\) redirect\('\/login'\)\n\s+if \(!LOVING_BY_DESIGN_AVAILABLE\) redirect\('\/products'\)\n/)
  }
  const list = src('app/products/page.tsx')
  assert.match(list, /const closed = !LOVING_BY_DESIGN_AVAILABLE && LOVING_BY_DESIGN_PRODUCTS\.includes\(product\.key\)/)
  assert.match(list, /const unsold = !owned && LOVING_BY_DESIGN_PRODUCTS\.includes\(product\.key\) && !lovingByDesignPurchasable\(\)/)
  assert.match(list, /\{closed \|\| unsold \? null : owned \?/)
})

test('opening the questionnaire opens neither checkout nor readings', () => {
  const avail = src('lib/product-availability.ts')
  assert.match(avail, /export const LOVING_BY_DESIGN_PURCHASE_AVAILABLE = false\n/)
  assert.match(avail, /export const LOVING_BY_DESIGN_READINGS_AVAILABLE = false\n/)
  assert.match(src('app/api/stripe/checkout/route.ts'), /if \(!lovingByDesignPurchasable\(\) && lovingByDesignPriceIds\(\)\.includes\(priceId\)\) \{\n\s+return NextResponse\.json\(\{ error: 'This product is not yet available' \}, \{ status: 403 \}\)/)
  for (const f of ['app/api/interpret-synastry/route.ts', 'app/api/interpret-composite/route.ts']) {
    const post = src(f).split(/^export async function POST/m)[1]
    assert.match(post.split('\n').slice(0, 6).join('\n'), /const readingsClosed = lovingByDesignReadingsClosed\(\)\n\s+if \(readingsClosed\) return readingsClosed/, f)
  }
})
