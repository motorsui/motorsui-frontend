// Run: npm test
// Parenting products read the child's chart only. The parent's row supplies
// ownership and the intake; its birth data never reaches the backend.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/lib/interpret/backend.ts', import.meta.url), 'utf8')
const resolver = src.slice(src.indexOf('export async function resolveParenting'))
  .split('\n}\n')[0]

test('parenting request body carries the child chart and no parent birth data', () => {
  assert.match(resolver, /body: section => \(\{ child: childBirth, section, intake \}\)/)
  assert.doesNotMatch(resolver, /birthFromChartJson\(parent/)
  assert.doesNotMatch(resolver, /parent:/)
})
