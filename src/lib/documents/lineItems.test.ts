import assert from 'node:assert/strict'
import test from 'node:test'

import {
  lineItemDraftToDbRow,
  normalizeLineItemDraft,
  parseNumericOrNull,
} from '@/lib/documents/lineItems'

test('parseNumericOrNull parses plain numbers', () => {
  assert.equal(parseNumericOrNull('20000'), 20000)
})

test('parseNumericOrNull strips currency symbols and commas', () => {
  assert.equal(parseNumericOrNull('¥20,000'), 20000)
  assert.equal(parseNumericOrNull('20000円'), 20000)
})

test('parseNumericOrNull returns null for empty or invalid', () => {
  assert.equal(parseNumericOrNull(''), null)
  assert.equal(parseNumericOrNull('abc'), null)
})

test('normalizeLineItemDraft trims fields and normalizes tax rate markers', () => {
  const result = normalizeLineItemDraft({
    line_no: 1,
    transaction_date: '',
    description: '  item  ',
    quantity: '1',
    unit: '個',
    unit_price: '1000',
    amount: '1000',
    tax_rate: '※',
  })
  assert.equal(result.description, 'item')
  assert.equal(result.tax_rate, '8')
  assert.equal(result.transaction_date, null)
})

test('lineItemDraftToDbRow maps draft to DB row with parsed numerics', () => {
  const row = lineItemDraftToDbRow(
    {
      line_no: 1,
      transaction_date: '2024-01-15',
      description: 'Sample',
      quantity: '2',
      unit: '個',
      unit_price: '10,000',
      amount: '20,000',
      tax_rate: '10',
    },
    'doc-id',
    'tenant-id'
  )
  assert.equal(row.document_id, 'doc-id')
  assert.equal(row.tenant_id, 'tenant-id')
  assert.equal(row.line_no, 1)
  assert.equal(row.transaction_date, '2024-01-15')
  assert.equal(row.unit_price, 10000)
  assert.equal(row.amount, 20000)
})

test('lineItemDraftToDbRow parses slash-separated transaction dates', () => {
  const row = lineItemDraftToDbRow(
    {
      line_no: 1,
      transaction_date: '2024/01/15',
      description: 'Sample',
      quantity: '1',
      unit: '',
      unit_price: '',
      amount: '',
      tax_rate: '',
    },
    'doc-id',
    'tenant-id'
  )
  assert.equal(row.transaction_date, '2024-01-15')
})

test('lineItemDraftToDbRow stores null for unparseable numerics and dates', () => {
  const row = lineItemDraftToDbRow(
    {
      line_no: 2,
      transaction_date: 'invalid',
      description: '',
      quantity: '',
      unit: '',
      unit_price: 'n/a',
      amount: '',
      tax_rate: '',
    },
    'doc-id',
    'tenant-id'
  )
  assert.equal(row.transaction_date, null)
  assert.equal(row.unit_price, null)
  assert.equal(row.amount, null)
})
