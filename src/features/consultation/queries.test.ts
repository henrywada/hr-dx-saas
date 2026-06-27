import assert from 'node:assert/strict'
import test from 'node:test'

import { maskAnonymousAuthor } from './queries'

test('匿名の場合は氏名を伏せて「匿名相談者」になる', () => {
  const rows = [{ id: 'c1', is_anonymous: true, employee_name: '山田太郎' }]
  const result = maskAnonymousAuthor(rows)
  assert.equal(result[0].display_name, '匿名相談者')
})

test('記名の場合は氏名がそのまま表示される', () => {
  const rows = [{ id: 'c2', is_anonymous: false, employee_name: '佐藤花子' }]
  const result = maskAnonymousAuthor(rows)
  assert.equal(result[0].display_name, '佐藤花子')
})

test('元の行の他フィールドは保持される', () => {
  const rows = [{ id: 'c3', is_anonymous: false, employee_name: '鈴木一郎', status: 'open' }]
  const result = maskAnonymousAuthor(rows)
  assert.equal(result[0].status, 'open')
})

test('匿名の場合は employee_name 自体もnullになる（実名漏洩防止）', () => {
  const rows = [{ id: 'c4', is_anonymous: true, employee_name: '田中次郎' }]
  const result = maskAnonymousAuthor(rows)
  assert.equal(result[0].employee_name, null)
})

test('記名の場合は employee_name はそのまま保持される', () => {
  const rows = [{ id: 'c5', is_anonymous: false, employee_name: '高橋三郎' }]
  const result = maskAnonymousAuthor(rows)
  assert.equal(result[0].employee_name, '高橋三郎')
})
