import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isObjectiveOwner,
  isTaskGroupManager,
  isTaskGroupMember,
  canAssignManager,
  canAssignMember,
  canLogWork,
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
