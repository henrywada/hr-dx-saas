import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isObjectiveOwner,
  isTaskGroupManager,
  isTaskGroupMember,
  canAssignManager,
  canAssignMember,
  canLogWork,
  isTaskResponsible,
  isTaskMember,
  canEditTask,
} from './permissions'

test('責任者本人ならtrue', () => {
  assert.equal(isObjectiveOwner('emp-1', 'emp-1'), true)
})

test('責任者本人でなければfalse', () => {
  assert.equal(isObjectiveOwner('emp-1', 'emp-2'), false)
})

test('マネージャー一覧に含まれればtrue', () => {
  assert.equal(isTaskGroupManager(['emp-1', 'emp-2'], 'emp-2'), true)
})

test('マネージャー一覧に含まれなければfalse', () => {
  assert.equal(isTaskGroupManager(['emp-1'], 'emp-2'), false)
})

test('メンバー一覧に含まれればtrue', () => {
  assert.equal(isTaskGroupMember(['emp-3'], 'emp-3'), true)
})

test('マネージャー割当は責任者のみ可能', () => {
  assert.equal(canAssignManager(true), true)
  assert.equal(canAssignManager(false), false)
})

test('メンバー割当は責任者かマネージャーなら可能', () => {
  assert.equal(canAssignMember(true, false), true)
  assert.equal(canAssignMember(false, true), true)
  assert.equal(canAssignMember(false, false), false)
})

test('責任者は工数を記録できる', () => {
  assert.equal(canLogWork(true, false, false), true)
})

test('マネージャーは工数を記録できる', () => {
  assert.equal(canLogWork(false, true, false), true)
})

test('メンバーは工数を記録できる', () => {
  assert.equal(canLogWork(false, false, true), true)
})

test('参加者でなければ工数を記録できない', () => {
  assert.equal(canLogWork(false, false, false), false)
})

test('タスク責任者本人ならtrue', () => {
  assert.equal(isTaskResponsible('emp-1', 'emp-1'), true)
})

test('責任者が未設定(null)ならfalse', () => {
  assert.equal(isTaskResponsible(null, 'emp-1'), false)
})

test('メンバーに含まれていればtrue', () => {
  assert.equal(isTaskMember(['emp-1', 'emp-2'], 'emp-1'), true)
})

test('メンバーに含まれていなければfalse', () => {
  assert.equal(isTaskMember(['emp-2'], 'emp-1'), false)
})

test('目標責任者は編集可', () => {
  assert.equal(canEditTask(true, false), true)
})

test('タスク責任者は編集可', () => {
  assert.equal(canEditTask(false, true), true)
})

test('どちらでもなければ編集不可', () => {
  assert.equal(canEditTask(false, false), false)
})
