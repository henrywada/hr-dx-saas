import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BUCKET,
  finalObjectPath,
  isTmpPath,
  tmpObjectPath,
} from '@/lib/documents/storagePaths'

const tenantId = '11111111-1111-4111-8111-111111111111'
const userId = '22222222-2222-4222-8222-222222222222'
const fileId = '33333333-3333-4333-8333-333333333333'
const documentId = '44444444-4444-4444-8444-444444444444'

test('exports the captured-documents bucket name', () => {
  assert.equal(BUCKET, 'captured-documents')
})

test('builds a tmp object path', () => {
  assert.equal(
    tmpObjectPath(tenantId, userId, fileId),
    `${tenantId}/tmp/${userId}/${fileId}.jpg`
  )
})

test('builds a final object path', () => {
  assert.equal(
    finalObjectPath(tenantId, 'business_card', '2026-08-28', documentId, fileId),
    `${tenantId}/business_card/2026-08-28/${documentId}/${fileId}.jpg`
  )
})

test('isTmpPath returns true for a matching tmp path', () => {
  const path = tmpObjectPath(tenantId, userId, fileId)
  assert.equal(isTmpPath(path, tenantId, userId), true)
})

test('isTmpPath returns false when tenantId does not match', () => {
  const path = tmpObjectPath(tenantId, userId, fileId)
  assert.equal(
    isTmpPath(path, '99999999-9999-4999-8999-999999999999', userId),
    false
  )
})

test('isTmpPath returns false when userId does not match', () => {
  const path = tmpObjectPath(tenantId, userId, fileId)
  assert.equal(
    isTmpPath(path, tenantId, '99999999-9999-4999-8999-999999999999'),
    false
  )
})

test('isTmpPath returns false for a final path', () => {
  const path = finalObjectPath(
    tenantId,
    'business_card',
    '2026-08-28',
    documentId,
    fileId
  )
  assert.equal(isTmpPath(path, tenantId, userId), false)
})
