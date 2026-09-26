import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildRecoveryLink } from './recovery-link'

const MYOU = 'aaaa-myou'
const env = { MYOU_PUBLIC_TENANT_ID: MYOU, NEXT_PUBLIC_APP_URL: 'https://app.hr-dx.jp' }

test('MYOU テナントは myou ドメインの reset-password-myou を返す（既定 URL）', () => {
  assert.equal(
    buildRecoveryLink({ tenantId: MYOU, token: 'tok', email: 'a+b@x.jp', env }),
    'https://myou.hr-dx.jp/reset-password-myou?token=tok&email=a%2Bb%40x.jp'
  )
})
test('MYOU_SITE_URL があればそれを使う', () => {
  assert.equal(
    buildRecoveryLink({
      tenantId: MYOU,
      token: 't',
      email: 'a@x.jp',
      env: { ...env, MYOU_SITE_URL: 'http://myou.localhost:3000' },
    }),
    'http://myou.localhost:3000/reset-password-myou?token=t&email=a%40x.jp'
  )
})
test('通常テナントは app の reset-password', () => {
  assert.equal(
    buildRecoveryLink({ tenantId: 'other', token: 't', email: 'a@x.jp', env }),
    'https://app.hr-dx.jp/reset-password?token=t&email=a%40x.jp'
  )
})
test('tenantId が null / APP_URL 未設定なら localhost の app リンク', () => {
  assert.equal(
    buildRecoveryLink({ tenantId: null, token: 't', email: 'a@x.jp', env: {} }),
    'http://localhost:3000/reset-password?token=t&email=a%40x.jp'
  )
})
