import assert from 'node:assert/strict'
import test from 'node:test'

import { getDocumentPlugin } from '@/features/documents/plugins/registry'
import {
  PURCHASE_ORDER_HEADER_KEYS,
  normalizeOrderNoRecipient,
  parseAmountYen,
  parseLineItems,
  parsePurchaseOrderHeader,
  purchaseOrderPlugin,
} from '@/features/documents/plugins/purchase_order/plugin'

test('purchaseOrderPlugin maps header to indexed fields using recipient as counterparty', () => {
  const extracted = Object.fromEntries(
    PURCHASE_ORDER_HEADER_KEYS.map((k) => [k, ''])
  ) as Record<string, string>
  extracted.order_number = 'PO-20240131-001'
  extracted.recipient_name = 'サンプル株式会社'
  extracted.issuer_name = '自社株式会社'
  extracted.total = '360,000'
  const indexed = purchaseOrderPlugin.toIndexedFields(extracted, {
    notes: '',
    tags: [],
    contextDate: '2024-01-31',
  })
  assert.equal(indexed.title, 'PO-20240131-001')
  assert.equal(indexed.counterparty, 'サンプル株式会社')
  assert.notEqual(indexed.counterparty, '自社株式会社')
  assert.equal(indexed.amount_yen, 360000)
  assert.equal(indexed.context_date, '2024-01-31')
})

test('purchaseOrderPlugin parses line items from array', () => {
  const items = parseLineItems([
    { line_no: 1, description: 'サンプルA', amount: '20000', tax_rate: '10' },
  ])
  assert.equal(items.length, 1)
  assert.equal(items[0].description, 'サンプルA')
  assert.equal(items[0].tax_rate, '10')
})

test('purchaseOrderPlugin builds duplicate key from order number and recipient', () => {
  const keys = purchaseOrderPlugin.duplicateKeys({
    order_number: ' 123 ',
    recipient_name: 'Sample Co.',
  })
  assert.equal(keys[0].kind, 'order_no_recipient')
  assert.ok(keys[0].value.includes('123'))
  assert.ok(keys[0].value.includes('sample co.'))
})

test('purchaseOrderPlugin exposes line item and structured OCR flags', () => {
  assert.equal(purchaseOrderPlugin.supportsLineItems, true)
  assert.equal(purchaseOrderPlugin.structuredOcr, true)
  assert.equal(purchaseOrderPlugin.parseLineItems, parseLineItems)
})

test('purchaseOrderPlugin allows 1-10 page images only', () => {
  assert.deepEqual(purchaseOrderPlugin.imagePolicy, {
    min: 1,
    max: 10,
    allowedRoles: ['page'],
  })
})

test('purchaseOrderPlugin uses user contextDate for indexed context_date', () => {
  const extracted = Object.fromEntries(
    PURCHASE_ORDER_HEADER_KEYS.map((k) => [k, ''])
  ) as Record<string, string>
  extracted.issue_date = '2024-01-31'
  const indexed = purchaseOrderPlugin.toIndexedFields(extracted, {
    notes: '',
    tags: [],
    contextDate: null,
  })
  assert.equal(indexed.context_date, null)
})

test('purchaseOrderPlugin returns null amount_yen when total is unparseable', () => {
  const extracted = Object.fromEntries(
    PURCHASE_ORDER_HEADER_KEYS.map((k) => [k, ''])
  ) as Record<string, string>
  extracted.total = 'invalid'
  const indexed = purchaseOrderPlugin.toIndexedFields(extracted, {
    notes: '',
    tags: [],
    contextDate: null,
  })
  assert.equal(indexed.amount_yen, null)
})

test('purchaseOrderPlugin includes every header key in the analyze prompt', () => {
  for (const key of PURCHASE_ORDER_HEADER_KEYS) {
    assert.ok(purchaseOrderPlugin.analyzePrompt.includes(key))
  }
  assert.equal(purchaseOrderPlugin.analyzePrompt.includes('invoice_number'), false)
  assert.equal(purchaseOrderPlugin.analyzePrompt.includes('bank_info'), false)
  assert.equal(purchaseOrderPlugin.analyzePrompt.includes('請求書'), false)
})

test('parsePurchaseOrderHeader parses from structured header object', () => {
  const parsed = parsePurchaseOrderHeader({
    header: {
      order_number: 'PO-001',
      recipient_name: 'テスト株式会社',
    },
  })
  assert.equal(parsed.order_number, 'PO-001')
  assert.equal(parsed.recipient_name, 'テスト株式会社')
  assert.equal(parsed.issuer_name, '')
})

test('parsePurchaseOrderHeader parses from flat object', () => {
  const parsed = parsePurchaseOrderHeader({
    order_number: 'PO-002',
    total: '1000',
    extra: 'ignored',
  })
  assert.equal(parsed.order_number, 'PO-002')
  assert.equal(parsed.total, '1000')
  assert.equal('extra' in parsed, false)
})

test('parsePurchaseOrderHeader returns empty header for invalid input', () => {
  const parsed = parsePurchaseOrderHeader(null)
  assert.equal(parsed.order_number, '')
  assert.equal(Object.keys(parsed).length, PURCHASE_ORDER_HEADER_KEYS.length)
})

test('parsePurchaseOrderHeader reads purchase-order-specific fields', () => {
  const parsed = parsePurchaseOrderHeader({
    delivery_date: '2024-02-15',
    delivery_place: '本社倉庫',
    payment_terms: '月末締め翌月末払い',
  })
  assert.equal(parsed.delivery_date, '2024-02-15')
  assert.equal(parsed.delivery_place, '本社倉庫')
  assert.equal(parsed.payment_terms, '月末締め翌月末払い')
})

test('parsePurchaseOrderHeader does not carry over invoice-only fields', () => {
  assert.equal(PURCHASE_ORDER_HEADER_KEYS.includes('due_date' as never), false)
  assert.equal(PURCHASE_ORDER_HEADER_KEYS.includes('bank_info' as never), false)
})

test('purchaseOrderPlugin.parseExtracted delegates to parsePurchaseOrderHeader', () => {
  const parsed = purchaseOrderPlugin.parseExtracted({
    header: { order_number: 'X-1' },
  })
  assert.equal(parsed.order_number, 'X-1')
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
    { line_no: 2, description: '値引', amount: '-5000' },
  ])
  assert.equal(items[0].amount, '-5000')
})

test('normalizeOrderNoRecipient normalizes whitespace and case', () => {
  assert.equal(normalizeOrderNoRecipient(' 123 ', 'Sample  Co.'), '123|sample co.')
})

test('purchaseOrderPlugin.duplicateKeys omits key when order number is empty', () => {
  assert.deepEqual(
    purchaseOrderPlugin.duplicateKeys({ order_number: '', recipient_name: 'Co' }),
    []
  )
})

test('purchaseOrderPlugin.duplicateKeys omits key when recipient is empty', () => {
  assert.deepEqual(
    purchaseOrderPlugin.duplicateKeys({ order_number: '123', recipient_name: '' }),
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

test('registry returns purchase_order plugin by id', () => {
  assert.equal(getDocumentPlugin('purchase_order'), purchaseOrderPlugin)
})

test('registry still returns invoice and business_card plugins', () => {
  assert.equal(getDocumentPlugin('invoice')?.id, 'invoice')
  assert.equal(getDocumentPlugin('business_card')?.id, 'business_card')
})
