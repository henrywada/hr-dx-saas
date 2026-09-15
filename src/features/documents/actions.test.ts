import assert from 'node:assert/strict'
import test from 'node:test'
import { canMutateDocument } from './canMutateDocument'
import {
  applyCompanyVisiblePolicy,
  deleteDocumentSchema,
  documentTypeSchema,
  exportDocumentsSchema,
  updateDocumentSchema,
} from './types'

const ownerUserId = '11111111-1111-4111-8111-111111111111'
const otherUserId = '22222222-2222-4222-8222-222222222222'
const docId = '33333333-3333-4333-8333-333333333333'

test('documentTypeSchema: 4種別を受け付ける', () => {
  for (const type of ['business_card', 'invoice', 'purchase_order', 'receipt']) {
    assert.equal(documentTypeSchema.safeParse(type).success, true)
  }
})

test('documentTypeSchema: 未知の種別を拒否する', () => {
  assert.equal(documentTypeSchema.safeParse('unknown').success, false)
})

test('applyCompanyVisiblePolicy: 名刺のみ true を許可', () => {
  assert.equal(applyCompanyVisiblePolicy('business_card', true), true)
  assert.equal(applyCompanyVisiblePolicy('business_card', false), false)
})

test('applyCompanyVisiblePolicy: 名刺以外は常に false', () => {
  for (const type of ['invoice', 'purchase_order', 'receipt']) {
    assert.equal(applyCompanyVisiblePolicy(type, true), false)
    assert.equal(applyCompanyVisiblePolicy(type, false), false)
    assert.equal(applyCompanyVisiblePolicy(type, undefined), false)
  }
})

test('canMutateDocument: 本人のみ mutate 可', () => {
  assert.equal(canMutateDocument({ actorUserId: ownerUserId, ownerUserId }), true)
  assert.equal(canMutateDocument({ actorUserId: otherUserId, ownerUserId }), false)
})

test('deleteDocumentSchema: UUID を要求する', () => {
  assert.equal(deleteDocumentSchema.safeParse({ id: docId }).success, true)
  assert.equal(deleteDocumentSchema.safeParse({ id: 'not-uuid' }).success, false)
})

test('updateDocumentSchema: contextDate は YYYY-MM-DD 形式', () => {
  assert.equal(
    updateDocumentSchema.safeParse({ id: docId, contextDate: '2026-09-16' }).success,
    true
  )
  assert.equal(
    updateDocumentSchema.safeParse({ id: docId, contextDate: '2026/09/16' }).success,
    false
  )
})

test('exportDocumentsSchema: invoice / purchase_order のみ', () => {
  assert.equal(
    exportDocumentsSchema.safeParse({
      documentType: 'invoice',
      documentIds: [docId],
    }).success,
    true
  )
  assert.equal(
    exportDocumentsSchema.safeParse({
      documentType: 'purchase_order',
      documentIds: [docId],
      exportMode: 'with_line_items',
    }).success,
    true
  )
  assert.equal(
    exportDocumentsSchema.safeParse({
      documentType: 'receipt',
      documentIds: [docId],
    }).success,
    false
  )
  assert.equal(
    exportDocumentsSchema.safeParse({
      documentType: 'business_card',
      documentIds: [docId],
    }).success,
    false
  )
})

test('exportDocumentsSchema: 空配列・101件超を拒否', () => {
  assert.equal(
    exportDocumentsSchema.safeParse({ documentType: 'invoice', documentIds: [] }).success,
    false
  )
  const ids = Array.from({ length: 101 }, (_, i) =>
    `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
  )
  assert.equal(
    exportDocumentsSchema.safeParse({ documentType: 'invoice', documentIds: ids }).success,
    false
  )
})
