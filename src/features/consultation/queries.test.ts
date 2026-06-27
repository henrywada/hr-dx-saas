import assert from 'node:assert/strict'
import test from 'node:test'

import { maskAnonymousAuthor, sanitizeConsultationForViewer, sanitizeReplyForViewer } from './queries'
import type { Consultation, ConsultationReply } from './types'

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

const baseConsultation: Consultation = {
  id: 'cons-1',
  tenant_id: 'tenant-1',
  employee_id: 'employee-1',
  is_anonymous: true,
  category: 'other',
  body: '本文',
  status: 'open',
  assigned_to: null,
  created_at: '2026-06-27T00:00:00.000Z',
}

test('匿名相談を対応者が見る場合、consultation.employee_id は null になる（実名漏洩防止）', () => {
  const result = sanitizeConsultationForViewer(baseConsultation, true)
  assert.equal(result.employee_id, null)
})

test('匿名相談でも本人（対応者ではない）が見る場合は employee_id を保持する', () => {
  const result = sanitizeConsultationForViewer(baseConsultation, false)
  assert.equal(result.employee_id, 'employee-1')
})

test('記名相談を対応者が見る場合は employee_id を保持する', () => {
  const named = { ...baseConsultation, is_anonymous: false }
  const result = sanitizeConsultationForViewer(named, true)
  assert.equal(result.employee_id, 'employee-1')
})

const baseReply: ConsultationReply = {
  id: 'reply-1',
  consultation_id: 'cons-1',
  author_employee_id: 'employee-1',
  is_staff_reply: false,
  body: '返信本文',
  created_at: '2026-06-27T00:00:00.000Z',
}

test('匿名相談の本人による返信を対応者が見る場合、author_employee_id は null になる', () => {
  const result = sanitizeReplyForViewer(baseReply, true, true)
  assert.equal(result.author_employee_id, null)
})

test('匿名相談でも対応者自身の返信は author_employee_id を保持する', () => {
  const staffReply = { ...baseReply, is_staff_reply: true }
  const result = sanitizeReplyForViewer(staffReply, true, true)
  assert.equal(result.author_employee_id, 'employee-1')
})

test('記名相談の返信を対応者が見る場合は author_employee_id を保持する', () => {
  const result = sanitizeReplyForViewer(baseReply, true, false)
  assert.equal(result.author_employee_id, 'employee-1')
})
