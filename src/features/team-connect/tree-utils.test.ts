import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildDivisionTree,
  compareDivisionTreeSiblings,
  groupEmployeesByDivision,
} from './tree-utils'
import type { Division, DivisionTreeNode, EmployeeSummary } from './types'

function division(overrides: Partial<Division> & { id: string }): Division {
  return {
    tenant_id: 't1',
    name: null,
    parent_id: null,
    layer: null,
    code: null,
    ...overrides,
  }
}

function employee(overrides: Partial<EmployeeSummary> & { id: string }): EmployeeSummary {
  return {
    name: null,
    employee_no: null,
    job_title: null,
    division_id: null,
    ...overrides,
  }
}

test('親子関係から階層ツリーを構築する', () => {
  const divisions = [
    division({ id: 'root', name: '本社', parent_id: null, layer: 1, code: '1' }),
    division({ id: 'child', name: '営業部', parent_id: 'root', layer: 2, code: '1-1' }),
  ]
  const tree = buildDivisionTree(divisions, new Map())

  assert.equal(tree.length, 1)
  assert.equal(tree[0].id, 'root')
  assert.equal(tree[0].children.length, 1)
  assert.equal(tree[0].children[0].id, 'child')
})

test('部署ごとの従業員数と子孫合計人数を集計する', () => {
  const divisions = [
    division({ id: 'root', name: '本社', parent_id: null, layer: 1 }),
    division({ id: 'child', name: '営業部', parent_id: 'root', layer: 2 }),
  ]
  const employeesByDivision = new Map([
    ['root', [employee({ id: 'e1' })]],
    ['child', [employee({ id: 'e2' }), employee({ id: 'e3' })]],
  ])
  const tree = buildDivisionTree(divisions, employeesByDivision)

  assert.equal(tree[0].employeeCount, 1)
  assert.equal(tree[0].totalEmployeeCount, 3)
  assert.equal(tree[0].children[0].totalEmployeeCount, 2)
})

test('兄弟ノードはcodeの数値ソート順に並ぶ', () => {
  const divisions = [
    division({ id: 'd10', name: '部署10', parent_id: null, code: '10' }),
    division({ id: 'd2', name: '部署2', parent_id: null, code: '2' }),
  ]
  const tree = buildDivisionTree(divisions, new Map())

  assert.deepEqual(
    tree.map(n => n.id),
    ['d2', 'd10']
  )
})

test('codeが無い部署は後方に並ぶ', () => {
  const a: DivisionTreeNode = {
    ...division({ id: 'a', code: null, layer: 1, name: 'A' }),
    children: [],
    employeeCount: 0,
    totalEmployeeCount: 0,
    employees: [],
  }
  const b: DivisionTreeNode = {
    ...division({ id: 'b', code: '1', layer: 1, name: 'B' }),
    children: [],
    employeeCount: 0,
    totalEmployeeCount: 0,
    employees: [],
  }

  assert.ok(compareDivisionTreeSiblings(a, b) > 0)
  assert.ok(compareDivisionTreeSiblings(b, a) < 0)
})

test('division_idの無い従業員はマップに含まれない', () => {
  const employees = [
    employee({ id: 'e1', division_id: 'd1' }),
    employee({ id: 'e2', division_id: null }),
  ]
  const map = groupEmployeesByDivision(employees)

  assert.equal(map.get('d1')?.length, 1)
  assert.equal([...map.values()].flat().length, 1)
})

test('空配列を渡した場合は空のツリーを返す', () => {
  assert.deepEqual(buildDivisionTree([], new Map()), [])
})
