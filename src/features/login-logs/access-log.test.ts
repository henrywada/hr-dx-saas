import assert from 'node:assert/strict'
import test from 'node:test'
import { parseLogView } from './params'
import { buildPageNameResolver, toAccessLogRow, type AccessLog } from './access-log'

const noName = () => null

const base: AccessLog = {
  id: '1',
  created_at: '2026-09-27T00:00:00Z',
  action: 'PAGE_VIEW',
  path: '/adm/login-logs',
  employee_name: '太郎',
  email: 't@example.com',
  tenant_id: null,
  tenant_name: 'A社',
}

test('view 未指定・不正値は sessions（Log in/out）', () => {
  assert.equal(parseLogView(undefined), 'sessions')
  assert.equal(parseLogView('foo'), 'sessions')
  assert.equal(parseLogView(['pages']), 'sessions')
})

test('view=pages はページ閲覧', () => {
  assert.equal(parseLogView('pages'), 'pages')
})

test('PAGE_VIEW はパスのみ表示し、ログイン/ログアウト/重要操作は空', () => {
  const r = toAccessLogRow(base, noName)
  assert.deepEqual(
    [r.is_login, r.is_logout, r.page_path, r.operation],
    [false, false, '/adm/login-logs', null],
  )
})

test('LOGIN_SUCCESS はログイン列のみ', () => {
  const r = toAccessLogRow({ ...base, action: 'LOGIN_SUCCESS', path: '/login' }, noName)
  assert.deepEqual([r.is_login, r.is_logout, r.page_path, r.operation], [true, false, null, null])
})

test('LOGOUT はログアウト列のみ', () => {
  const r = toAccessLogRow({ ...base, action: 'LOGOUT', path: '/logout' }, noName)
  assert.deepEqual([r.is_login, r.is_logout, r.page_path, r.operation], [false, true, null, null])
})

test('その他の action は重要操作列に action 名を出す', () => {
  const r = toAccessLogRow({ ...base, action: 'EDIT_RECORD', path: '/adm/x' }, noName)
  assert.deepEqual([r.is_login, r.is_logout, r.page_path, r.operation], [false, false, null, 'EDIT_RECORD'])
})

const resolve = buildPageNameResolver([
  { name: '従業員登録', route_path: '/adm/employees' },
  { name: '従業員詳細', route_path: '/adm/employees/detail' },
  { name: 'トップ', route_path: '/top/' },
  { name: '重複A', route_path: '/survey/answer' },
  { name: '重複B', route_path: '/survey/answer' },
  { name: null, route_path: '/adm/noname' },
  { name: 'ルート', route_path: '/' },
  { name: '空', route_path: '' },
  { name: 'パス無し', route_path: null },
])

test('route_path と完全一致したら service.name', () => {
  assert.equal(resolve('/adm/employees'), '従業員登録')
})

test('末尾スラッシュは無視して照合する', () => {
  assert.equal(resolve('/top'), 'トップ')
  assert.equal(resolve('/top/'), 'トップ')
})

test('動的パスはセグメント境界で最長の route_path に一致する', () => {
  assert.equal(resolve('/adm/employees/123'), '従業員登録')
  assert.equal(resolve('/adm/employees/detail/9'), '従業員詳細')
})

test('セグメント境界でない前方一致はしない', () => {
  assert.equal(resolve('/adm/employeesX'), null)
})

test('未登録・null・ルート/空の route_path・名前無しは null', () => {
  assert.equal(resolve('/login'), null)
  assert.equal(resolve('/adm/subMenu'), null)
  assert.equal(resolve(null), null)
  assert.equal(resolve('/adm/noname'), null)
})

test('route_path が重複したら先に現れた service.name を採用', () => {
  assert.equal(resolve('/survey/answer'), '重複A')
})

test('PAGE_VIEW のみ page_name を解決する', () => {
  assert.equal(toAccessLogRow(base, () => '画面X').page_name, '画面X')
  assert.equal(toAccessLogRow({ ...base, action: 'LOGOUT' }, () => '画面X').page_name, null)
})
