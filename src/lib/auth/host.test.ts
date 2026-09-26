import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isHostAudienceConsistent, isMyouHost, resolveHostRedirect } from './host'

test('myou.hr-dx.jp を判定（ポート・大文字を許容）', () => {
  assert.equal(isMyouHost('myou.hr-dx.jp'), true)
  assert.equal(isMyouHost('MYOU.hr-dx.jp:443'), true)
})
test('ローカル検証用 myou.localhost を判定', () => {
  assert.equal(isMyouHost('myou.localhost:3000'), true)
})
test('ホストと audience の整合（サーバー側で Host ヘッダーを検証する）', () => {
  assert.equal(isHostAudienceConsistent('myou.hr-dx.jp', 'myou'), true)
  assert.equal(isHostAudienceConsistent('app.hr-dx.jp', 'default'), true)
  assert.equal(isHostAudienceConsistent('app.hr-dx.jp', 'myou'), false)
  assert.equal(isHostAudienceConsistent('myou.hr-dx.jp', 'default'), false)
  assert.equal(isHostAudienceConsistent(null, 'myou'), false)
})
test('app / localhost / null は false', () => {
  assert.equal(isMyouHost('app.hr-dx.jp'), false)
  assert.equal(isMyouHost('evil-myou.hr-dx.jp'), false)
  assert.equal(isMyouHost('myou.hr-dx.jp.evil.com'), false)
  assert.equal(isMyouHost('localhost:3000'), false)
  assert.equal(isMyouHost(null), false)
})

test('myou ホスト：未ログインの入口・app 用の認証画面を myou 用へ', () => {
  assert.equal(resolveHostRedirect('/', true, false), '/login-myou')
  assert.equal(resolveHostRedirect('/login', true, false), '/login-myou')
  assert.equal(resolveHostRedirect('/login/', true, false), '/login-myou')
  assert.equal(resolveHostRedirect('/forgot-password', true, false), '/forgot-password-myou')
  assert.equal(resolveHostRedirect('/reset-password', true, true), '/reset-password-myou')
  // myou ドメインからは新規サインアップ（別テナントの作成）に入れない
  assert.equal(resolveHostRedirect('/signup', true, false), '/login-myou')
  assert.equal(resolveHostRedirect('/signup/complete', true, false), '/login-myou')
})
test('myou ホスト：ログイン済みの / と /login は既存処理（/top へ）に任せる', () => {
  assert.equal(resolveHostRedirect('/', true, true), null)
  assert.equal(resolveHostRedirect('/login', true, true), null)
})
test('app ホスト：myou 専用画面は app 用へ戻す', () => {
  assert.equal(resolveHostRedirect('/login-myou', false, false), '/login')
  assert.equal(resolveHostRedirect('/forgot-password-myou', false, true), '/forgot-password')
  assert.equal(resolveHostRedirect('/reset-password-myou', false, true), '/reset-password')
})
test('その他のパスは null', () => {
  assert.equal(resolveHostRedirect('/top', true, false), null)
  assert.equal(resolveHostRedirect('/login', false, false), null)
  assert.equal(resolveHostRedirect('/login-myou', true, false), null)
})
