import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveLawName } from './egov-law-registry'

test('正式名称を指定すると law_id を解決する', () => {
  const result = resolveLawName('労働基準法')
  assert.equal(result.name, '労働基準法')
  assert.equal(result.lawId, '322AC0000000049')
})

test('略称を指定すると正式名称へ変換して law_id を解決する', () => {
  const result = resolveLawName('労基法')
  assert.equal(result.name, '労働基準法')
  assert.equal(result.lawId, '322AC0000000049')
})

test('別の略称（安衛法）も正式名称へ変換される', () => {
  const result = resolveLawName('安衛法')
  assert.equal(result.name, '労働安全衛生法')
  assert.equal(result.lawId, '347AC0000000057')
})

test('未知の名称は lawId が null になる', () => {
  const result = resolveLawName('存在しない法令')
  assert.equal(result.name, '存在しない法令')
  assert.equal(result.lawId, null)
})
