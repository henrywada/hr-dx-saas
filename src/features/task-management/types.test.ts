import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createObjectiveSchema,
  updateObjectiveSchema,
  updateTaskStatusSchema,
  updateTaskProgressSchema,
  updateTaskBasicInfoSchema,
  addTaskAssigneeSchema,
  createCommentSchema,
  updateCommentSchema,
  deleteCommentSchema,
  createWorkLogSchema,
  updateWorkLogSchema,
  deleteWorkLogSchema,
  getTaskWorkLogsTargetSchema,
  createSimpleTaskSchema,
} from './types'

const VALID_UUID = '11111111-1111-4111-8111-111111111111'

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

test('目標更新: objectiveIdとtitleで成功する', () => {
  const result = updateObjectiveSchema.safeParse({
    objectiveId: VALID_UUID,
    title: '営業：売上１０％アップ',
    description: '説明・・・\n説明・・・',
    dueDate: '2026-12-31',
  })
  assert.equal(result.success, true)
})

test('目標更新: titleが空文字は拒否される', () => {
  const result = updateObjectiveSchema.safeParse({
    objectiveId: VALID_UUID,
    title: '',
  })
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

test('基本情報更新: title・goalSummary・dueDateを指定して成功する', () => {
  const result = updateTaskBasicInfoSchema.safeParse({
    taskId: VALID_UUID,
    title: '要件定義書の作成',
    goalSummary: '関係者合意を得る',
    dueDate: '2026-10-01',
  })
  assert.equal(result.success, true)
})

test('基本情報更新: titleのみ（goalSummary/dueDate省略）でも成功する', () => {
  const result = updateTaskBasicInfoSchema.safeParse({
    taskId: VALID_UUID,
    title: '要件定義書の作成',
  })
  assert.equal(result.success, true)
})

test('基本情報更新: titleが空文字は拒否される', () => {
  const result = updateTaskBasicInfoSchema.safeParse({
    taskId: VALID_UUID,
    title: '',
  })
  assert.equal(result.success, false)
})

test('基本情報更新: dueDateの形式が不正なら拒否される', () => {
  const result = updateTaskBasicInfoSchema.safeParse({
    taskId: VALID_UUID,
    title: '要件定義書の作成',
    dueDate: '2026/10/01',
  })
  assert.equal(result.success, false)
})

test('コメント作成: taskIdのみ指定で成功する', () => {
  const result = createCommentSchema.safeParse({
    taskId: '11111111-1111-4111-8111-111111111111',
    commentType: 'general',
    targetEmployeeId: '22222222-2222-4222-8222-222222222222',
    body: '進捗を報告します',
  })
  assert.equal(result.success, true)
})

test('コメント作成: taskGroupIdのみ指定で成功する', () => {
  const result = createCommentSchema.safeParse({
    taskGroupId: '11111111-1111-4111-8111-111111111111',
    commentType: 'general',
    targetEmployeeId: '22222222-2222-4222-8222-222222222222',
    body: '助言です',
  })
  assert.equal(result.success, true)
})

test('コメント作成: advice種別は宛先(targetEmployeeId)が無いと拒否される', () => {
  const result = createCommentSchema.safeParse({
    taskGroupId: '11111111-1111-4111-8111-111111111111',
    commentType: 'advice',
    body: '助言です',
  })
  assert.equal(result.success, false)
})

test('コメント作成: advice種別かつtargetEmployeeIdありなら成功する', () => {
  const result = createCommentSchema.safeParse({
    taskGroupId: '11111111-1111-4111-8111-111111111111',
    commentType: 'advice',
    targetEmployeeId: '22222222-2222-4222-8222-222222222222',
    body: '助言です',
  })
  assert.equal(result.success, true)
})

test('コメント作成: general種別は宛先(targetEmployeeId)が無いと拒否される', () => {
  const result = createCommentSchema.safeParse({
    taskGroupId: '11111111-1111-4111-8111-111111111111',
    commentType: 'general',
    body: 'コメントです',
  })
  assert.equal(result.success, false)
})

test('コメント作成: general種別かつtargetEmployeeIdありなら成功する', () => {
  const result = createCommentSchema.safeParse({
    taskGroupId: '11111111-1111-4111-8111-111111111111',
    commentType: 'general',
    targetEmployeeId: '22222222-2222-4222-8222-222222222222',
    body: 'コメントです',
  })
  assert.equal(result.success, true)
})

test('コメント作成: taskIdとtaskGroupIdを両方指定すると拒否される', () => {
  const result = createCommentSchema.safeParse({
    taskId: '11111111-1111-4111-8111-111111111111',
    taskGroupId: '22222222-2222-4222-8222-222222222222',
    commentType: 'general',
    body: 'x',
  })
  assert.equal(result.success, false)
})

test('コメント作成: taskIdとtaskGroupIdをどちらも指定しないと拒否される', () => {
  const result = createCommentSchema.safeParse({
    commentType: 'general',
    body: 'x',
  })
  assert.equal(result.success, false)
})

test('コメント作成: bodyが空文字は拒否される', () => {
  const result = createCommentSchema.safeParse({
    taskId: '11111111-1111-4111-8111-111111111111',
    commentType: 'general',
    body: '',
  })
  assert.equal(result.success, false)
})

test('コメント作成: 未定義のcommentTypeは拒否される', () => {
  const result = createCommentSchema.safeParse({
    taskId: '11111111-1111-4111-8111-111111111111',
    commentType: 'unknown',
    body: 'x',
  })
  assert.equal(result.success, false)
})

test('コメント作成: parentCommentIdは省略可能', () => {
  const result = createCommentSchema.safeParse({
    taskId: '11111111-1111-4111-8111-111111111111',
    commentType: 'general',
    targetEmployeeId: '22222222-2222-4222-8222-222222222222',
    body: 'x',
  })
  assert.equal(result.success, true)
})

test('コメント更新: bodyのみで成功する', () => {
  const result = updateCommentSchema.safeParse({
    commentId: '11111111-1111-4111-8111-111111111111',
    body: '修正後の本文',
  })
  assert.equal(result.success, true)
})

test('コメント更新: bodyが空文字は拒否される', () => {
  const result = updateCommentSchema.safeParse({
    commentId: '11111111-1111-4111-8111-111111111111',
    body: '',
  })
  assert.equal(result.success, false)
})

test('コメント削除: commentIdがUUID形式でなければ拒否される', () => {
  const result = deleteCommentSchema.safeParse({ commentId: 'not-a-uuid' })
  assert.equal(result.success, false)
})

test('工数記録作成: hoursが0は拒否される（positive制約）', () => {
  const result = createWorkLogSchema.safeParse({
    taskId: VALID_UUID,
    workDate: '2026-09-07',
    hours: 0,
  })
  assert.equal(result.success, false)
})

test('工数記録作成: hoursが負の値は拒否される', () => {
  const result = createWorkLogSchema.safeParse({
    taskId: VALID_UUID,
    workDate: '2026-09-07',
    hours: -1,
  })
  assert.equal(result.success, false)
})

test('工数記録作成: hoursが妥当な中間値なら成功する', () => {
  const result = createWorkLogSchema.safeParse({
    taskId: VALID_UUID,
    workDate: '2026-09-07',
    hours: 7.5,
  })
  assert.equal(result.success, true)
})

test('工数記録作成: hoursがちょうど24なら成功する', () => {
  const result = createWorkLogSchema.safeParse({
    taskId: VALID_UUID,
    workDate: '2026-09-07',
    hours: 24,
  })
  assert.equal(result.success, true)
})

test('工数記録作成: hoursが24.5はmax(24)を超えるため拒否される', () => {
  const result = createWorkLogSchema.safeParse({
    taskId: VALID_UUID,
    workDate: '2026-09-07',
    hours: 24.5,
  })
  assert.equal(result.success, false)
})

test('工数記録作成: workDateがYYYY-MM-DD形式でなければ拒否される', () => {
  const result = createWorkLogSchema.safeParse({
    taskId: VALID_UUID,
    workDate: '2026/09/07',
    hours: 1,
  })
  assert.equal(result.success, false)
})

test('工数記録作成: noteが1000文字を超えると拒否される', () => {
  const result = createWorkLogSchema.safeParse({
    taskId: VALID_UUID,
    workDate: '2026-09-07',
    hours: 1,
    note: 'a'.repeat(1001),
  })
  assert.equal(result.success, false)
})

test('工数記録作成: noteがちょうど1000文字なら成功する', () => {
  const result = createWorkLogSchema.safeParse({
    taskId: VALID_UUID,
    workDate: '2026-09-07',
    hours: 1,
    note: 'a'.repeat(1000),
  })
  assert.equal(result.success, true)
})

test('工数記録作成: noteは省略可能', () => {
  const result = createWorkLogSchema.safeParse({
    taskId: VALID_UUID,
    workDate: '2026-09-07',
    hours: 1,
  })
  assert.equal(result.success, true)
})

test('工数記録作成: taskIdがUUID形式でなければ拒否される', () => {
  const result = createWorkLogSchema.safeParse({
    taskId: 'not-a-uuid',
    workDate: '2026-09-07',
    hours: 1,
  })
  assert.equal(result.success, false)
})

test('工数記録更新: hoursが0は拒否される（positive制約）', () => {
  const result = updateWorkLogSchema.safeParse({
    workLogId: VALID_UUID,
    workDate: '2026-09-07',
    hours: 0,
  })
  assert.equal(result.success, false)
})

test('工数記録更新: hoursが妥当な中間値なら成功する', () => {
  const result = updateWorkLogSchema.safeParse({
    workLogId: VALID_UUID,
    workDate: '2026-09-07',
    hours: 3,
  })
  assert.equal(result.success, true)
})

test('工数記録更新: workDateがYYYY-MM-DD形式でなければ拒否される', () => {
  const result = updateWorkLogSchema.safeParse({
    workLogId: VALID_UUID,
    workDate: '07-09-2026',
    hours: 1,
  })
  assert.equal(result.success, false)
})

test('工数記録更新: workLogIdがUUID形式でなければ拒否される', () => {
  const result = updateWorkLogSchema.safeParse({
    workLogId: 'not-a-uuid',
    workDate: '2026-09-07',
    hours: 1,
  })
  assert.equal(result.success, false)
})

test('工数記録削除: workLogIdがUUID形式でなければ拒否される', () => {
  const result = deleteWorkLogSchema.safeParse({ workLogId: 'not-a-uuid' })
  assert.equal(result.success, false)
})

test('工数記録削除: workLogIdがUUID形式なら成功する', () => {
  const result = deleteWorkLogSchema.safeParse({ workLogId: VALID_UUID })
  assert.equal(result.success, true)
})

test('工数記録一覧取得: taskIdがUUID形式でなければ拒否される', () => {
  const result = getTaskWorkLogsTargetSchema.safeParse({ taskId: 'not-a-uuid' })
  assert.equal(result.success, false)
})

test('工数記録一覧取得: taskIdがUUID形式なら成功する', () => {
  const result = getTaskWorkLogsTargetSchema.safeParse({ taskId: VALID_UUID })
  assert.equal(result.success, true)
})

test('addTaskAssigneeSchemaはroleを省略するとmemberになる', () => {
  const parsed = addTaskAssigneeSchema.parse({
    taskId: VALID_UUID,
    employeeId: '22222222-2222-4222-8222-222222222222',
  })
  assert.equal(parsed.role, 'member')
})

test('createCommentSchemaはsuggestionにtargetEmployeeIdが無いと失敗する', () => {
  assert.throws(() =>
    createCommentSchema.parse({
      taskGroupId: VALID_UUID,
      commentType: 'suggestion',
      body: 'テスト',
    })
  )
})

test('createCommentSchemaはreportにtargetEmployeeIdがあれば成功する', () => {
  const parsed = createCommentSchema.parse({
    taskGroupId: VALID_UUID,
    commentType: 'report',
    targetEmployeeId: '22222222-2222-4222-8222-222222222222',
    body: 'テスト',
  })
  assert.equal(parsed.commentType, 'report')
})

test('createSimpleTaskSchemaはresponsibleEmployeeId必須', () => {
  assert.throws(() =>
    createSimpleTaskSchema.parse({
      taskGroupId: VALID_UUID,
      title: 'タスク',
    })
  )
})

test('createSimpleTaskSchemaはPGシード形式のUUID（version 0）も受け入れる', () => {
  const result = createSimpleTaskSchema.safeParse({
    taskGroupId: VALID_UUID,
    title: 'タスク',
    responsibleEmployeeId: 'bb000001-0000-0000-0000-000000000001',
  })
  assert.equal(result.success, true)
})
