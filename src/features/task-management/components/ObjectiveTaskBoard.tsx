'use client'

import type { EmployeeOption } from '../employee-filter'
import type { Task } from '../types'

interface ObjectiveTaskBoardProps {
  objectiveId: string
  taskGroupId: string
  tasks: Task[]
  employees: EmployeeOption[]
  employeeNameById: Record<string, string>
  currentEmployeeId: string | null
  isObjectiveOwner: boolean
}

/**
 * 仮実装（Task 11で置き換える）。
 * タスクカードグリッド＋編集/削除操作＋モーダル管理はTask 11で実装する。
 * ここではpage.tsxからのprops形状のみ確定させ、ビルドを通すためのプレースホルダーとする。
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ObjectiveTaskBoard(_props: ObjectiveTaskBoardProps) {
  return <div className="text-xs text-slate-500">準備中</div>
}
