import assert from 'node:assert/strict'
import test from 'node:test'

import { createCareerDiscussionSchema, scheduleAppointmentSchema, canConductCareerDiscussion } from './types'

const VALID_UUID = '11111111-1111-4111-8111-111111111111'

test('正常な入力はパースに成功する', () => {
  const result = createCareerDiscussionSchema.safeParse({
    employeeId: VALID_UUID,
    theme: '将来のキャリア志向',
  })
  assert.equal(result.success, true)
})

test('career_aspiration等の任意項目を含めてもパースに成功する', () => {
  const result = createCareerDiscussionSchema.safeParse({
    employeeId: VALID_UUID,
    theme: '将来のキャリア志向',
    careerAspiration: '3年後にマネージャーを目指したい',
    notes: '本人は前向き',
    nextDate: '2027-01-15',
    evaluationPeriodId: VALID_UUID,
  })
  assert.equal(result.success, true)
})

test('employeeIdがUUID形式でない場合は拒否される', () => {
  const result = createCareerDiscussionSchema.safeParse({
    employeeId: 'not-a-uuid',
    theme: '将来のキャリア志向',
  })
  assert.equal(result.success, false)
})

test('themeが空文字は拒否される', () => {
  const result = createCareerDiscussionSchema.safeParse({
    employeeId: VALID_UUID,
    theme: '',
  })
  assert.equal(result.success, false)
})

test('themeが201文字は拒否される', () => {
  const result = createCareerDiscussionSchema.safeParse({
    employeeId: VALID_UUID,
    theme: 'a'.repeat(201),
  })
  assert.equal(result.success, false)
})

test('nextDateの形式が不正な場合は拒否される', () => {
  const result = createCareerDiscussionSchema.safeParse({
    employeeId: VALID_UUID,
    theme: '将来のキャリア志向',
    nextDate: '2027/01/15',
  })
  assert.equal(result.success, false)
})

test('is_managerがtrueなら記録権限がある', () => {
  assert.equal(canConductCareerDiscussion('employee', true), true)
})

test('appRoleがemployeeかつis_managerがfalseなら記録権限がない', () => {
  assert.equal(canConductCareerDiscussion('employee', false), false)
})

test('appRoleがhrなら記録権限がある', () => {
  assert.equal(canConductCareerDiscussion('hr', false), true)
})

test('予約: 正常な入力はパースに成功する', () => {
  const result = scheduleAppointmentSchema.safeParse({
    employeeId: VALID_UUID,
    scheduledAt: '2026-07-15T10:00:00.000Z',
    theme: 'スキル開発計画',
  })
  assert.equal(result.success, true)
})

test('予約: scheduledAt が不正な場合は拒否される', () => {
  const result = scheduleAppointmentSchema.safeParse({
    employeeId: VALID_UUID,
    scheduledAt: 'not-a-datetime',
  })
  assert.equal(result.success, false)
})
