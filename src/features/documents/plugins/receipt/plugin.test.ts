import assert from 'node:assert/strict'
import test from 'node:test'

import {
  RECEIPT_EXPENSE_HEADER_KEYS,
  RECEIPT_QUALIFIED_HEADER_KEYS,
  receiptExpenseMode,
  receiptPlugin,
  receiptQualifiedMode,
} from '@/features/documents/plugins/receipt/plugin'

test('receiptExpenseMode.parseExtracted whitelists known keys and fills missing ones with empty string', () => {
  const parsed = receiptExpenseMode.parseExtracted({
    header: { transaction_date: '2026-08-01', issuer_name: 'サンプル商店' },
  })
  assert.equal(parsed.transaction_date, '2026-08-01')
  assert.equal(parsed.issuer_name, 'サンプル商店')
  assert.equal(parsed.amount, '')
  assert.equal(Object.keys(parsed).length, RECEIPT_EXPENSE_HEADER_KEYS.length)
})

test('receiptExpenseMode.parseExtracted ignores unknown keys and manual-input keys not present in AI response', () => {
  const parsed = receiptExpenseMode.parseExtracted({
    header: { transaction_date: '2026-08-01', bogus_key: 'x' },
  })
  assert.equal('bogus_key' in parsed, false)
  assert.equal(parsed.purpose, '')
})

test('receiptExpenseMode.parseExtracted returns an all-empty header for invalid input', () => {
  const parsed = receiptExpenseMode.parseExtracted(null)
  assert.equal(parsed.transaction_date, '')
  assert.equal(Object.keys(parsed).length, RECEIPT_EXPENSE_HEADER_KEYS.length)
})

test('receiptExpenseMode.toIndexedFields prefers purpose for title, falls back to issuer_name', () => {
  const withPurpose = receiptExpenseMode.toIndexedFields(
    { purpose: '打合せ', issuer_name: 'サンプル商店', amount: '1,200' },
    { notes: '', tags: [], contextDate: '2026-08-01' }
  )
  assert.equal(withPurpose.title, '打合せ')

  const withoutPurpose = receiptExpenseMode.toIndexedFields(
    { purpose: '', issuer_name: 'サンプル商店', amount: '1,200' },
    { notes: '', tags: [], contextDate: '2026-08-01' }
  )
  assert.equal(withoutPurpose.title, 'サンプル商店')
})

test('receiptExpenseMode.toIndexedFields maps amount to amount_yen and issuer_name to counterparty', () => {
  const indexed = receiptExpenseMode.toIndexedFields(
    { issuer_name: 'サンプル商店', amount: '¥1,200' },
    { notes: '', tags: [], contextDate: '2026-08-01' }
  )
  assert.equal(indexed.counterparty, 'サンプル商店')
  assert.equal(indexed.amount_yen, 1200)
  assert.equal(indexed.context_date, '2026-08-01')
})

test('receiptExpenseMode.toIndexedFields returns null amount_yen when amount is unparseable', () => {
  const indexed = receiptExpenseMode.toIndexedFields(
    { amount: 'invalid' },
    { notes: '', tags: [], contextDate: null }
  )
  assert.equal(indexed.amount_yen, null)
})

test('receiptExpenseMode.duplicateKeys returns a key when date, amount, and issuer are all present', () => {
  const keys = receiptExpenseMode.duplicateKeys({
    transaction_date: '2026-08-01',
    amount: '1200',
    issuer_name: ' Sample Shop ',
  })
  assert.equal(keys.length, 1)
  assert.equal(keys[0].kind, 'receipt_expense_key')
  assert.ok(keys[0].value.includes('2026-08-01'))
  assert.ok(keys[0].value.includes('1200'))
  assert.ok(keys[0].value.includes('sample shop'))
})

test('receiptExpenseMode.duplicateKeys omits key when any required field is missing', () => {
  assert.deepEqual(
    receiptExpenseMode.duplicateKeys({ transaction_date: '', amount: '1200', issuer_name: 'Co' }),
    []
  )
  assert.deepEqual(
    receiptExpenseMode.duplicateKeys({ transaction_date: '2026-08-01', amount: '', issuer_name: 'Co' }),
    []
  )
  assert.deepEqual(
    receiptExpenseMode.duplicateKeys({ transaction_date: '2026-08-01', amount: '1200', issuer_name: '' }),
    []
  )
})

test('receiptQualifiedMode.parseExtracted whitelists known keys and fills missing ones with empty string', () => {
  const parsed = receiptQualifiedMode.parseExtracted({
    header: { registration_number: 'T1234567890123', issuer_name: 'サンプル株式会社' },
  })
  assert.equal(parsed.registration_number, 'T1234567890123')
  assert.equal(parsed.issuer_name, 'サンプル株式会社')
  assert.equal(parsed.subtotal_10, '')
  assert.equal(Object.keys(parsed).length, RECEIPT_QUALIFIED_HEADER_KEYS.length)
})

test('receiptQualifiedMode.toIndexedFields prefers registration_number for title, falls back to issuer_name', () => {
  const withReg = receiptQualifiedMode.toIndexedFields(
    { registration_number: 'T1234567890123', issuer_name: 'サンプル株式会社', total: '1200' },
    { notes: '', tags: [], contextDate: '2026-08-01' }
  )
  assert.equal(withReg.title, 'T1234567890123')

  const withoutReg = receiptQualifiedMode.toIndexedFields(
    { registration_number: '', issuer_name: 'サンプル株式会社', total: '1200' },
    { notes: '', tags: [], contextDate: '2026-08-01' }
  )
  assert.equal(withoutReg.title, 'サンプル株式会社')
})

test('receiptQualifiedMode.toIndexedFields maps total to amount_yen', () => {
  const indexed = receiptQualifiedMode.toIndexedFields(
    { total: '¥1,200-' },
    { notes: '', tags: [], contextDate: null }
  )
  assert.equal(indexed.amount_yen, 1200)
})

test('receiptQualifiedMode.duplicateKeys returns a key when registration_number and transaction_date are present', () => {
  const keys = receiptQualifiedMode.duplicateKeys({
    registration_number: ' T1234567890123 ',
    transaction_date: '2026-08-01',
  })
  assert.equal(keys.length, 1)
  assert.equal(keys[0].kind, 'receipt_qualified_key')
  assert.ok(keys[0].value.includes('t1234567890123'))
  assert.ok(keys[0].value.includes('2026-08-01'))
})

test('receiptQualifiedMode.duplicateKeys omits key when registration_number or transaction_date is missing', () => {
  assert.deepEqual(
    receiptQualifiedMode.duplicateKeys({ registration_number: '', transaction_date: '2026-08-01' }),
    []
  )
  assert.deepEqual(
    receiptQualifiedMode.duplicateKeys({ registration_number: 'T1234567890123', transaction_date: '' }),
    []
  )
})

test('receiptPlugin has exactly the expense and qualified_invoice modes', () => {
  assert.equal(receiptPlugin.modes?.length, 2)
  assert.deepEqual(receiptPlugin.modes?.map((m) => m.id), [
    'expense',
    'qualified_invoice',
  ])
})

test('receiptPlugin allows exactly one page image', () => {
  assert.deepEqual(receiptPlugin.imagePolicy, {
    min: 1,
    max: 1,
    allowedRoles: ['page'],
  })
})

test('receiptPlugin does not support line items but exposes a safe empty parser', () => {
  assert.equal(receiptPlugin.supportsLineItems, false)
  assert.equal(receiptPlugin.structuredOcr, true)
  assert.deepEqual(receiptPlugin.parseLineItems?.(['anything']), [])
})
