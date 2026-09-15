import assert from 'node:assert/strict'
import test from 'node:test'
import { isLiffClientUserAgent } from './isLiffClientUserAgent'

test('isLiffClientUserAgent: LINE アプリ内ブラウザの UA は true', () => {
  assert.equal(
    isLiffClientUserAgent(
      'Mozilla/5.0 (Linux; Android 12; moto g52j 5G Build/...) Line/13.5.0'
    ),
    true
  )
})

test('isLiffClientUserAgent: LINE iOS アプリ内ブラウザの UA は true', () => {
  assert.equal(
    isLiffClientUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Line/13.5.0'
    ),
    true
  )
})

test('isLiffClientUserAgent: 通常のデスクトップブラウザは false', () => {
  assert.equal(
    isLiffClientUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36'
    ),
    false
  )
})

test('isLiffClientUserAgent: user agent が null のとき false', () => {
  assert.equal(isLiffClientUserAgent(null), false)
})

test('isLiffClientUserAgent: 無関係な line 文字列に誤反応しない', () => {
  assert.equal(isLiffClientUserAgent('Mozilla/5.0 SomeAirline/2.0'), false)
})
