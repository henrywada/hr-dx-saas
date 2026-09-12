/**
 * 組織階層（divisions）を扱う純粋関数群。
 *
 * `DivisionFilteredEmployeePicker`（クライアント側の絞り込み）と
 * `queries.ts`（サーバー側の部門フィルタ）の双方から参照するため、
 * UIコンポーネントから切り出して共有している。
 * 「組織を選択したらその子孫組織も含める」という本機能の規約を一箇所に集約する。
 */

/** 木構造の組み立てに必要な最小限の組織情報 */
export interface DivisionTreeNode {
  id: string
  name: string
  parentId: string | null
}

export interface FlatDivisionOption {
  id: string
  /** ドロップダウン表示用（階層インデント付き） */
  label: string
  depth: number
}

/**
 * divisions を parent_id に基づく木構造の深さ優先順に平坦化し、
 * 階層インデント付きラベルを付与する。
 * （layer 列のソートだけでは兄弟が親をまたいで並び、同名部署が区別できない）
 */
export function flattenDivisionsInTreeOrder(divisions: DivisionTreeNode[]): FlatDivisionOption[] {
  const byParent = new Map<string | null, DivisionTreeNode[]>()
  for (const d of divisions) {
    const key = d.parentId
    const list = byParent.get(key) ?? []
    list.push(d)
    byParent.set(key, list)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  }

  const result: FlatDivisionOption[] = []
  const visited = new Set<string>()

  function walk(parentId: string | null, depth: number) {
    const children = byParent.get(parentId) ?? []
    for (const child of children) {
      if (visited.has(child.id)) continue
      visited.add(child.id)
      const indent = '\u3000'.repeat(depth) // 全角スペースで階層を表現
      const branch = depth === 0 ? '' : '└ '
      result.push({
        id: child.id,
        depth,
        label: `${indent}${branch}${child.name}`,
      })
      walk(child.id, depth + 1)
    }
  }

  walk(null, 0)

  // 親が一覧に無い孤児ノードも末尾に追加（データ不整合時のフォールバック）
  for (const d of divisions) {
    if (visited.has(d.id)) continue
    result.push({ id: d.id, depth: 0, label: d.name })
  }

  return result
}

/** 指定組織とその子孫 division id の集合を返す */
export function collectDivisionAndDescendantIds(
  rootId: string,
  divisions: DivisionTreeNode[]
): Set<string> {
  const childrenByParent = new Map<string | null, string[]>()
  for (const d of divisions) {
    const list = childrenByParent.get(d.parentId) ?? []
    list.push(d.id)
    childrenByParent.set(d.parentId, list)
  }

  const result = new Set<string>()
  const stack = [rootId]
  while (stack.length > 0) {
    const id = stack.pop()!
    if (result.has(id)) continue
    result.add(id)
    for (const childId of childrenByParent.get(id) ?? []) {
      stack.push(childId)
    }
  }
  return result
}
