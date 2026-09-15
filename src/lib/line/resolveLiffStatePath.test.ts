import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveLiffStatePath } from './resolveLiffStatePath'

test('resolveLiffStatePath: /entry を /liff/entry にマップする', () => {
  assert.equal(resolveLiffStatePath('/entry'), '/liff/entry')
})

test('resolveLiffStatePath: /friend-link/{token} を /liff/friend-link/{token} にマップする', () => {
  assert.equal(
    resolveLiffStatePath('/friend-link/skM7-i5df98rFqxTTwaRo26AEINUIpKaBexOArb'),
    '/liff/friend-link/skM7-i5df98rFqxTTwaRo26AEINUIpKaBexOArb'
  )
})

test('resolveLiffStatePath: /link は未実装なので /liff/entry に落とす', () => {
  assert.equal(resolveLiffStatePath('/link'), '/liff/entry')
})

test('resolveLiffStatePath: state が null のとき /liff/entry にフォールバック', () => {
  assert.equal(resolveLiffStatePath(null), '/liff/entry')
})

test('resolveLiffStatePath: state が空のとき /liff/entry にフォールバック', () => {
  assert.equal(resolveLiffStatePath(''), '/liff/entry')
})

test('resolveLiffStatePath: スラッシュで始まらない state は /liff/entry にフォールバック', () => {
  assert.equal(resolveLiffStatePath('entry'), '/liff/entry')
})

test('resolveLiffStatePath: プロトコル相対 URL を拒否する', () => {
  assert.equal(resolveLiffStatePath('//evil.com/phish'), '/liff/entry')
})

test('resolveLiffStatePath: 未知の liff サブルートは /liff/entry にフォールバック', () => {
  assert.equal(resolveLiffStatePath('/../admin'), '/liff/entry')
  assert.equal(resolveLiffStatePath('/linked-somewhere-else'), '/liff/entry')
})
