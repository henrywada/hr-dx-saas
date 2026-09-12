import assert from 'node:assert/strict'
import test from 'node:test'
import {
  collectDivisionAndDescendantIds,
  flattenDivisionsInTreeOrder,
  type DivisionTreeNode,
} from './division-tree'

/**
 * テスト用の組織ツリー
 *
 * root
 *  ├ sales
 *  │   ├ sales-east
 *  │   │   └ sales-east-1   ← 孫（3階層目）
 *  │   └ sales-west
 *  └ dev
 */
const divisions: DivisionTreeNode[] = [
  { id: 'root', name: '本社', parentId: null },
  { id: 'sales', name: 'あ営業本部', parentId: 'root' },
  { id: 'sales-east', name: 'あ東日本営業部', parentId: 'sales' },
  { id: 'sales-east-1', name: 'あ東京営業1課', parentId: 'sales-east' },
  { id: 'sales-west', name: 'か西日本営業部', parentId: 'sales' },
  { id: 'dev', name: 'か開発本部', parentId: 'root' },
]

test('collectDivisionAndDescendantIds: 子を持たない組織は自分自身のみを返す', () => {
  const result = collectDivisionAndDescendantIds('dev', divisions)
  assert.deepEqual([...result].sort(), ['dev'])
})

test('collectDivisionAndDescendantIds: 子を持つ組織は配下のサブツリーをすべて返す', () => {
  const result = collectDivisionAndDescendantIds('sales-east', divisions)
  assert.deepEqual([...result].sort(), ['sales-east', 'sales-east-1'])
})

test('collectDivisionAndDescendantIds: 無関係な兄弟組織は含まれない', () => {
  const result = collectDivisionAndDescendantIds('sales', divisions)
  assert.ok(!result.has('dev'))
  assert.ok(!result.has('root'))
})

test('collectDivisionAndDescendantIds: 孫まで含む多階層ツリーを漏れなく収集する', () => {
  const result = collectDivisionAndDescendantIds('sales', divisions)
  assert.deepEqual([...result].sort(), ['sales', 'sales-east', 'sales-east-1', 'sales-west'])
})

test('collectDivisionAndDescendantIds: ルートを指定すると全組織が含まれる', () => {
  const result = collectDivisionAndDescendantIds('root', divisions)
  assert.equal(result.size, divisions.length)
})

test('collectDivisionAndDescendantIds: 一覧に存在しないIDでもその1件だけを返す（クラッシュしない）', () => {
  const result = collectDivisionAndDescendantIds('unknown-id', divisions)
  assert.deepEqual([...result], ['unknown-id'])
})

test('flattenDivisionsInTreeOrder: 深さ優先・兄弟は日本語ロケール順に並び、depthは階層と一致する', () => {
  const flat = flattenDivisionsInTreeOrder(divisions)

  assert.deepEqual(
    flat.map(f => f.id),
    // 兄弟は localeCompare('ja') 順（先頭かな「あ」<「か」で安定させている）
    ['root', 'sales', 'sales-east', 'sales-east-1', 'sales-west', 'dev']
  )
  assert.deepEqual(
    flat.map(f => f.depth),
    [0, 1, 2, 3, 2, 1]
  )
})

test('flattenDivisionsInTreeOrder: 階層が深いほど全角スペースのインデントが増える', () => {
  const flat = flattenDivisionsInTreeOrder(divisions)
  const byId = new Map(flat.map(f => [f.id, f.label]))

  assert.equal(byId.get('root'), '本社')
  assert.equal(byId.get('sales'), '　└ あ営業本部')
  assert.equal(byId.get('sales-east'), '　　└ あ東日本営業部')
  assert.equal(byId.get('sales-east-1'), '　　　└ あ東京営業1課')
})

test('flattenDivisionsInTreeOrder: 親が一覧に無い孤児ノードも末尾に残る', () => {
  const withOrphan: DivisionTreeNode[] = [
    ...divisions,
    { id: 'orphan', name: '所属不明部', parentId: 'missing-parent' },
  ]
  const flat = flattenDivisionsInTreeOrder(withOrphan)

  assert.equal(flat.length, withOrphan.length)
  assert.deepEqual(flat[flat.length - 1], { id: 'orphan', depth: 0, label: '所属不明部' })
})
