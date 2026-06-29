// src/features/team-connect/tree-utils.ts
// 部署ツリー構築ロジック（src/features/organization/components/DivisionTree.tsx の buildTree() を
// 閲覧専用コンポーネントから再利用・ユニットテストできるよう純粋関数として切り出したもの）

import type { Division, DivisionTreeNode, EmployeeSummary } from './types'

/** 兄弟ノードの並び: divisions.code 昇順（numeric）、未入力コードは後方、同順位は layer → 部署名 */
export function compareDivisionTreeSiblings(a: DivisionTreeNode, b: DivisionTreeNode): number {
  const codeA = a.code?.trim() ?? ''
  const codeB = b.code?.trim() ?? ''
  if (codeA && codeB) {
    const cmp = codeA.localeCompare(codeB, 'ja', { numeric: true })
    if (cmp !== 0) return cmp
  } else if (codeA !== codeB) {
    if (!codeA) return 1
    if (!codeB) return -1
  }
  const layerCmp = (a.layer || 0) - (b.layer || 0)
  if (layerCmp !== 0) return layerCmp
  return (a.name || '').localeCompare(b.name || '', 'ja')
}

/** 部署一覧と部署別従業員マップから階層ツリーを構築する */
export function buildDivisionTree(
  divisions: Division[],
  employeesByDivision: Map<string, EmployeeSummary[]>
): DivisionTreeNode[] {
  const map = new Map<string, DivisionTreeNode>()
  const roots: DivisionTreeNode[] = []

  divisions.forEach(d => {
    const emps = employeesByDivision.get(d.id) || []
    map.set(d.id, {
      ...d,
      children: [],
      employeeCount: emps.length,
      totalEmployeeCount: emps.length,
      employees: emps,
    })
  })

  divisions.forEach(d => {
    const node = map.get(d.id)!
    if (d.parent_id && map.has(d.parent_id)) {
      map.get(d.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  function calcTotal(node: DivisionTreeNode): number {
    let total = node.employeeCount
    for (const child of node.children) {
      total += calcTotal(child)
    }
    node.totalEmployeeCount = total
    return total
  }
  roots.forEach(calcTotal)

  function sortChildren(node: DivisionTreeNode) {
    node.children.sort(compareDivisionTreeSiblings)
    node.children.forEach(sortChildren)
  }
  roots.sort(compareDivisionTreeSiblings)
  roots.forEach(sortChildren)

  return roots
}

/** 部署IDごとの従業員一覧マップを構築する */
export function groupEmployeesByDivision(
  employees: EmployeeSummary[]
): Map<string, EmployeeSummary[]> {
  const map = new Map<string, EmployeeSummary[]>()
  employees.forEach(emp => {
    if (emp.division_id) {
      const list = map.get(emp.division_id) || []
      list.push(emp)
      map.set(emp.division_id, list)
    }
  })
  return map
}
