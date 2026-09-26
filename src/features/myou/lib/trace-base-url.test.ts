import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveTraceBaseUrl } from './trace-base-url'

test('MYOU_SITE_URL があればそれを最優先で使う', () => {
  assert.equal(
    resolveTraceBaseUrl({
      MYOU_SITE_URL: 'https://myou.hr-dx.jp',
      NEXT_PUBLIC_APP_URL: 'https://app.hr-dx.jp',
      VERCEL_URL: 'x.vercel.app',
    }),
    'https://myou.hr-dx.jp'
  )
})

test('末尾スラッシュと前後の空白を除去する', () => {
  assert.equal(resolveTraceBaseUrl({ MYOU_SITE_URL: ' https://myou.hr-dx.jp/ ' }), 'https://myou.hr-dx.jp')
})

test('MYOU_SITE_URL が未設定・空なら NEXT_PUBLIC_APP_URL を使う', () => {
  assert.equal(
    resolveTraceBaseUrl({ NEXT_PUBLIC_APP_URL: 'https://app.hr-dx.jp/' }),
    'https://app.hr-dx.jp'
  )
  assert.equal(
    resolveTraceBaseUrl({ MYOU_SITE_URL: '  ', NEXT_PUBLIC_APP_URL: 'https://app.hr-dx.jp' }),
    'https://app.hr-dx.jp'
  )
})

test('どちらも無ければ VERCEL_URL、それも無ければ localhost', () => {
  assert.equal(resolveTraceBaseUrl({ VERCEL_URL: 'x.vercel.app' }), 'https://x.vercel.app')
  assert.equal(resolveTraceBaseUrl({}), 'http://localhost:3000')
})
