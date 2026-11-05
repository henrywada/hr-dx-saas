import assert from 'node:assert/strict'
import test from 'node:test'

import { buildStoragePath, isTenantOwnedPath } from './storage-path'

const TENANT = '421f9b0d-5db0-47b3-8d48-203b9213dc00'
const OTHER = '5ebb9fd2-f152-4578-999f-e3b82d5d27d5'

test('パスはテナント ID で始まる', () => {
  assert.ok(buildStoragePath(TENANT, '規程.pdf').startsWith(`${TENANT}/`))
})

test('日本語のファイル名でも ASCII だけのパスになり、拡張子は小文字で残る', () => {
  const p = buildStoragePath(TENANT, '就業規則 最新版.PDF')
  assert.match(p, /^[0-9a-f-]+\/[0-9a-f-]+\.pdf$/)
})

test('拡張子が無いファイル名でも例外にならない', () => {
  assert.match(buildStoragePath(TENANT, 'README'), /^[0-9a-f-]+\/[0-9a-f-]+$/)
})

test('同じファイル名でも毎回別のパスになる', () => {
  assert.notEqual(buildStoragePath(TENANT, 'a.pdf'), buildStoragePath(TENANT, 'a.pdf'))
})

test('自テナントのパスは受け付ける', () => {
  assert.equal(isTenantOwnedPath(TENANT, buildStoragePath(TENANT, 'a.pdf')), true)
})

test('他テナントのパスは拒否する', () => {
  assert.equal(isTenantOwnedPath(TENANT, buildStoragePath(OTHER, 'a.pdf')), false)
})

test('パストラバーサルや空のパスは拒否する', () => {
  assert.equal(isTenantOwnedPath(TENANT, `${TENANT}/../${OTHER}/a.pdf`), false)
  assert.equal(isTenantOwnedPath(TENANT, `/${TENANT}/a.pdf`), false)
  assert.equal(isTenantOwnedPath(TENANT, `${TENANT}/`), false)
  assert.equal(isTenantOwnedPath(TENANT, ''), false)
})
