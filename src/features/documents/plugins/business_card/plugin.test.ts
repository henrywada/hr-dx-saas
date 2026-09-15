import assert from 'node:assert/strict'
import test from 'node:test'

import { businessCardPlugin, mergeExtracted } from '@/features/documents/plugins/business_card/plugin'

test('businessCardPlugin.parseExtracted fills missing keys with empty string and drops extras', () => {
  const parsed = businessCardPlugin.parseExtracted({
    full_name: '山田太郎',
    extra: 'nope',
  })
  assert.equal(parsed.full_name, '山田太郎')
  assert.equal(parsed.email, '')
  assert.equal('extra' in parsed, false)
})

test('mergeExtracted prefers front and fills empties from back', () => {
  const merged = mergeExtracted(
    { full_name: '山田', company: '', email: 'a@example.com' },
    { full_name: 'Yamada', company: '例示商事', email: 'b@example.com' }
  )
  assert.equal(merged.full_name, '山田')
  assert.equal(merged.company, '例示商事')
  assert.equal(merged.email, 'a@example.com')
})

test('businessCardPlugin.toIndexedFields maps name/company/date and null amount', () => {
  const indexed = businessCardPlugin.toIndexedFields(
    { full_name: '山田太郎', company: '例示商事' },
    { notes: '', tags: [], contextDate: '2026-08-28' }
  )
  assert.equal(indexed.title, '山田太郎')
  assert.equal(indexed.counterparty, '例示商事')
  assert.equal(indexed.context_date, '2026-08-28')
  assert.equal(indexed.amount_yen, null)
})

test('businessCardPlugin.duplicateKeys emits email first then name_company', () => {
  const keys = businessCardPlugin.duplicateKeys({
    full_name: '山田  太郎',
    company: '例示商事',
    email: ' A@Example.com ',
  })
  assert.deepEqual(keys[0], { kind: 'email', value: 'a@example.com' })
  assert.deepEqual(keys[1], { kind: 'name_company', value: '山田 太郎|例示商事' })
})

test('businessCardPlugin.duplicateKeys omits empty keys', () => {
  const keys = businessCardPlugin.duplicateKeys({
    full_name: '',
    company: '例示商事',
    email: '',
  })
  assert.deepEqual(keys, [])
})
