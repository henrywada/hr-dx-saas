import assert from 'node:assert/strict'
import test from 'node:test'

import { formatEventAudienceLabel, normalizeEventAudienceInput } from './event-audience'

test('全社イベントは「全社」と表示する', () => {
  assert.equal(
    formatEventAudienceLabel({ audience_type: 'tenant', division_name: null }),
    '全社',
  )
})

test('部署限定イベントは部署名付きで表示する', () => {
  assert.equal(
    formatEventAudienceLabel({ audience_type: 'division', division_name: '営業部' }),
    '営業部（配下含む）',
  )
})

test('部署名がない場合は「部署限定」と表示する', () => {
  assert.equal(
    formatEventAudienceLabel({ audience_type: 'division', division_name: null }),
    '部署限定',
  )
})

test('全社指定時は division_id を null に正規化する', () => {
  assert.deepEqual(
    normalizeEventAudienceInput({ audience_type: 'tenant', division_id: '11111111-1111-4111-8111-111111111111' }),
    { audience_type: 'tenant', division_id: null },
  )
})

test('部署指定時は division_id を保持する', () => {
  const divisionId = '11111111-1111-4111-8111-111111111111'
  assert.deepEqual(
    normalizeEventAudienceInput({ audience_type: 'division', division_id: divisionId }),
    { audience_type: 'division', division_id: divisionId },
  )
})
