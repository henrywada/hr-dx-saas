import assert from 'node:assert/strict'
import test from 'node:test'
import { canOperateTask, resolveDropStatus } from './kanban'

test('canOperateTask: 責任者/マネージャーは担当者に関わらず操作可能', () => {
  const task = { assigneeEmployeeIds: ['other-1'] }
  assert.equal(canOperateTask(task, 'me', true), true)
  assert.equal(canOperateTask(task, null, true), true)
})

test('canOperateTask: 一般メンバーは自分が担当者に含まれる場合のみ操作可能', () => {
  const task = { assigneeEmployeeIds: ['me', 'other-1'] }
  assert.equal(canOperateTask(task, 'me', false), true)
  assert.equal(canOperateTask(task, 'other-2', false), false)
})

test('canOperateTask: 従業員レコード無しユーザー（myEmployeeId=null）は操作不可', () => {
  const task = { assigneeEmployeeIds: [] }
  assert.equal(canOperateTask(task, null, false), false)
})

test('resolveDropStatus: 有効なステータスIDならそのステータスを返す', () => {
  assert.equal(resolveDropStatus('todo'), 'todo')
  assert.equal(resolveDropStatus('in_progress'), 'in_progress')
  assert.equal(resolveDropStatus('blocked'), 'blocked')
})

test('resolveDropStatus: 未知の文字列IDはnullを返す', () => {
  assert.equal(resolveDropStatus('not-a-status'), null)
})

test('resolveDropStatus: overがnull/undefined/数値IDの場合はnullを返す', () => {
  assert.equal(resolveDropStatus(null), null)
  assert.equal(resolveDropStatus(undefined), null)
  assert.equal(resolveDropStatus(123), null)
})
