import assert from 'node:assert/strict'
import test from 'node:test'
import {
  aggregateHoursByEmployee,
  aggregateHoursByGroup,
  aggregateHoursByTask,
} from './work-log-summary'

test('メンバー別に工数を合計する', () => {
  const rows = [
    { employeeId: 'e1', employeeName: '山田太郎', hours: 2 },
    { employeeId: 'e2', employeeName: '佐藤花子', hours: 1.5 },
    { employeeId: 'e1', employeeName: '山田太郎', hours: 3 },
  ]
  assert.deepEqual(aggregateHoursByEmployee(rows), [
    { employeeId: 'e1', employeeName: '山田太郎', totalHours: 5 },
    { employeeId: 'e2', employeeName: '佐藤花子', totalHours: 1.5 },
  ])
})

test('メンバー別集計は合計時間の降順に並ぶ', () => {
  const rows = [
    { employeeId: 'e1', employeeName: '山田太郎', hours: 1 },
    { employeeId: 'e2', employeeName: '佐藤花子', hours: 5 },
  ]
  assert.deepEqual(aggregateHoursByEmployee(rows), [
    { employeeId: 'e2', employeeName: '佐藤花子', totalHours: 5 },
    { employeeId: 'e1', employeeName: '山田太郎', totalHours: 1 },
  ])
})

test('工数記録が無い場合は空配列を返す', () => {
  assert.deepEqual(aggregateHoursByEmployee([]), [])
})

test('タスクグループ別に工数を合計する', () => {
  const rows = [
    { taskGroupId: 'g1', taskGroupName: 'グループA', hours: 4 },
    { taskGroupId: 'g2', taskGroupName: 'グループB', hours: 2 },
    { taskGroupId: 'g1', taskGroupName: 'グループA', hours: 1 },
  ]
  assert.deepEqual(aggregateHoursByGroup(rows), [
    { taskGroupId: 'g1', taskGroupName: 'グループA', totalHours: 5 },
    { taskGroupId: 'g2', taskGroupName: 'グループB', totalHours: 2 },
  ])
})

test('タスク別に工数を合計する', () => {
  const rows = [
    { taskId: 't1', taskTitle: 'タスクA', hours: 3 },
    { taskId: 't2', taskTitle: 'タスクB', hours: 2 },
    { taskId: 't1', taskTitle: 'タスクA', hours: 4 },
  ]
  assert.deepEqual(aggregateHoursByTask(rows), [
    { taskId: 't1', taskTitle: 'タスクA', totalHours: 7 },
    { taskId: 't2', taskTitle: 'タスクB', totalHours: 2 },
  ])
})
