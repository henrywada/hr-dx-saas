import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createObjectiveSchema,
  createTaskSchema,
  updateTaskStatusSchema,
  updateTaskProgressSchema,
} from './types'

test('目標作成: titleのみで成功する', () => {
  const result = createObjectiveSchema.safeParse({ title: '2026年下期の採用強化' })
  assert.equal(result.success, true)
})

test('目標作成: titleが空文字は拒否される', () => {
  const result = createObjectiveSchema.safeParse({ title: '' })
  assert.equal(result.success, false)
})

test('目標作成: dueDateの形式が不正なら拒否される', () => {
  const result = createObjectiveSchema.safeParse({ title: 'x', dueDate: '2026/09/07' })
  assert.equal(result.success, false)
})

test('タスク作成: priorityを省略するとnormalが補完される', () => {
  const result = createTaskSchema.safeParse({
    taskGroupId: '11111111-1111-4111-8111-111111111111',
    title: '要件定義',
  })
  assert.equal(result.success, true)
  if (result.success) {
    assert.equal(result.data.priority, 'normal')
  }
})

test('タスク作成: taskGroupIdがUUID形式でなければ拒否される', () => {
  const result = createTaskSchema.safeParse({ taskGroupId: 'not-a-uuid', title: '要件定義' })
  assert.equal(result.success, false)
})

test('ステータス更新: 未定義のstatus値は拒否される', () => {
  const result = updateTaskStatusSchema.safeParse({
    taskId: '11111111-1111-4111-8111-111111111111',
    status: 'unknown',
  })
  assert.equal(result.success, false)
})

test('進捗率更新: 101は拒否される', () => {
  const result = updateTaskProgressSchema.safeParse({
    taskId: '11111111-1111-4111-8111-111111111111',
    progressPercent: 101,
  })
  assert.equal(result.success, false)
})

test('進捗率更新: 0と100は許容される', () => {
  const min = updateTaskProgressSchema.safeParse({
    taskId: '11111111-1111-4111-8111-111111111111',
    progressPercent: 0,
  })
  const max = updateTaskProgressSchema.safeParse({
    taskId: '11111111-1111-4111-8111-111111111111',
    progressPercent: 100,
  })
  assert.equal(min.success, true)
  assert.equal(max.success, true)
})
