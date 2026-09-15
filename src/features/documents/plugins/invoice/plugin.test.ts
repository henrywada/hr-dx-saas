import assert from 'node:assert/strict'
import test from 'node:test'

import { getDocumentPlugin } from '@/features/documents/plugins/registry'
import {
  INVOICE_HEADER_KEYS,
  invoicePlugin,
  normalizeInvoiceNoIssuer,
  parseAmountYen,
  parseInvoiceHeader,
  parseLineItems,
} from '@/features/documents/plugins/invoice/plugin'

test('invoicePlugin maps header to indexed fields', () => {
  const extracted = Object.fromEntries(
    INVOICE_HEADER_KEYS.map((k) => [k, ''])
  ) as Record<string, string>
  extracted.invoice_number = '20240131-001'
  extracted.issuer_name = 'サンプル株式会社'
  extracted.total = '360,000'
  const indexed = invoicePlugin.toIndexedFields(extracted, {
    notes: '',
    tags: [],
    contextDate: '2024-01-31',
  })
  assert.equal(indexed.title, '20240131-001')
  assert.equal(indexed.counterparty, 'サンプル株式会社')
  assert.equal(indexed.amount_yen, 360000)
  assert.equal(indexed.context_date, '2024-01-31')
})

test('invoicePlugin parses line items from array', () => {
  const items = parseLineItems([
    { line_no: 1, description: 'サンプルA', amount: '20000', tax_rate: '10' },
  ])
  assert.equal(items.length, 1)
  assert.equal(items[0].description, 'サンプルA')
  assert.equal(items[0].tax_rate, '10')
})

test('invoicePlugin builds duplicate key from invoice number and issuer', () => {
  const keys = invoicePlugin.duplicateKeys({
    invoice_number: ' 123 ',
    issuer_name: 'Sample Co.',
  })
  assert.equal(keys[0].kind, 'invoice_no_issuer')
  assert.ok(keys[0].value.includes('123'))
  assert.ok(keys[0].value.includes('sample co.'))
})

test('invoicePlugin exposes line item and structured OCR flags', () => {
  assert.equal(invoicePlugin.supportsLineItems, true)
  assert.equal(invoicePlugin.structuredOcr, true)
  assert.equal(invoicePlugin.parseLineItems, parseLineItems)
})

test('invoicePlugin allows 1-10 page images only', () => {
  assert.deepEqual(invoicePlugin.imagePolicy, {
    min: 1,
    max: 10,
    allowedRoles: ['page'],
  })
})

test('invoicePlugin uses user contextDate for indexed context_date', () => {
  const extracted = Object.fromEntries(
    INVOICE_HEADER_KEYS.map((k) => [k, ''])
  ) as Record<string, string>
  extracted.issue_date = '2024-01-31'
  const indexed = invoicePlugin.toIndexedFields(extracted, {
    notes: '',
    tags: [],
    contextDate: null,
  })
  assert.equal(indexed.context_date, null)
})

test('invoicePlugin returns null amount_yen when total is unparseable', () => {
  const extracted = Object.fromEntries(
    INVOICE_HEADER_KEYS.map((k) => [k, ''])
  ) as Record<string, string>
  extracted.total = 'invalid'
  const indexed = invoicePlugin.toIndexedFields(extracted, {
    notes: '',
    tags: [],
    contextDate: null,
  })
  assert.equal(indexed.amount_yen, null)
})

test('parseInvoiceHeader parses from structured header object', () => {
  const parsed = parseInvoiceHeader({
    header: {
      invoice_number: 'INV-001',
      issuer_name: 'テスト株式会社',
    },
  })
  assert.equal(parsed.invoice_number, 'INV-001')
  assert.equal(parsed.issuer_name, 'テスト株式会社')
  assert.equal(parsed.recipient_name, '')
})

test('parseInvoiceHeader parses from flat object', () => {
  const parsed = parseInvoiceHeader({
    invoice_number: 'INV-002',
    total: '1000',
    extra: 'ignored',
  })
  assert.equal(parsed.invoice_number, 'INV-002')
  assert.equal(parsed.total, '1000')
  assert.equal('extra' in parsed, false)
})

test('parseInvoiceHeader returns empty header for invalid input', () => {
  const parsed = parseInvoiceHeader(null)
  assert.equal(parsed.invoice_number, '')
  assert.equal(Object.keys(parsed).length, INVOICE_HEADER_KEYS.length)
})

test('invoicePlugin.parseExtracted delegates to parseInvoiceHeader', () => {
  const parsed = invoicePlugin.parseExtracted({
    header: { invoice_number: 'X-1' },
  })
  assert.equal(parsed.invoice_number, 'X-1')
})

test('parseLineItems returns empty array for non-array input', () => {
  assert.deepEqual(parseLineItems(null), [])
  assert.deepEqual(parseLineItems({}), [])
})

test('parseLineItems fills missing fields with defaults', () => {
  const items = parseLineItems([{ description: '品目のみ' }])
  assert.equal(items.length, 1)
  assert.deepEqual(items[0], {
    line_no: 1,
    transaction_date: null,
    description: '品目のみ',
    quantity: '',
    unit: '',
    unit_price: '',
    amount: '',
    tax_rate: '',
  })
})

test('parseLineItems interprets reduced tax mark as 8%', () => {
  const items = parseLineItems([{ line_no: 1, description: '軽減', tax_rate: '※' }])
  assert.equal(items[0].tax_rate, '8')
})

test('parseLineItems preserves negative amounts', () => {
  const items = parseLineItems([
    { line_no: 2, description: '出精値引', amount: '-5000' },
  ])
  assert.equal(items[0].amount, '-5000')
})

test('normalizeInvoiceNoIssuer normalizes whitespace and case', () => {
  assert.equal(normalizeInvoiceNoIssuer(' 123 ', 'Sample  Co.'), '123|sample co.')
})

test('invoicePlugin.duplicateKeys omits key when invoice number is empty', () => {
  assert.deepEqual(
    invoicePlugin.duplicateKeys({ invoice_number: '', issuer_name: 'Co' }),
    []
  )
})

test('invoicePlugin.duplicateKeys omits key when issuer is empty', () => {
  assert.deepEqual(
    invoicePlugin.duplicateKeys({ invoice_number: '123', issuer_name: '' }),
    []
  )
})

test('parseAmountYen strips currency symbols', () => {
  assert.equal(parseAmountYen('¥360,000-'), 360000)
  assert.equal(parseAmountYen(''), null)
})

test('parseAmountYen handles yen suffix and spaces', () => {
  assert.equal(parseAmountYen('360,000 円'), 360000)
})

test('parseAmountYen returns null for non-numeric values', () => {
  assert.equal(parseAmountYen('abc'), null)
})

test('registry returns invoice plugin by id', () => {
  assert.equal(getDocumentPlugin('invoice'), invoicePlugin)
})

test('registry still returns business_card plugin', () => {
  assert.equal(getDocumentPlugin('business_card')?.id, 'business_card')
})
