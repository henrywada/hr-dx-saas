export function calculateAverageProgress(percentages: number[]): number {
  if (percentages.length === 0) return 0
  const sum = percentages.reduce((acc, value) => acc + value, 0)
  return Math.round(sum / percentages.length)
}

/** {@link groupProgressByParent} に渡す1行分の入力（値と、その値が属する親のID） */
export interface ProgressRow {
  value: number
  parentId: string
}

/**
 * 子（タスク等）の値を親（マイルストーン・目標等）ごとにバケット分けし、
 * `calculateAverageProgress` でフラット平均した結果を親ID単位のマップで返す。
 *
 * `parentIds` に含まれる親は、対応する行が1件も無くても結果に `0` として含まれる
 * （`calculateAverageProgress([])` が0を返す挙動と一致させるため）。
 */
export function groupProgressByParent(
  rows: ProgressRow[],
  parentIds: string[]
): Record<string, number> {
  const valuesByParentId = new Map<string, number[]>()

  for (const row of rows) {
    const values = valuesByParentId.get(row.parentId) ?? []
    values.push(row.value)
    valuesByParentId.set(row.parentId, values)
  }

  const result: Record<string, number> = {}
  for (const parentId of parentIds) {
    result[parentId] = calculateAverageProgress(valuesByParentId.get(parentId) ?? [])
  }

  return result
}
