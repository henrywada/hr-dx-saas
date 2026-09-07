import assert from 'node:assert/strict'
import test from 'node:test'
import { filterEmployeesByName } from './employee-filter'

function employee(id: string, name: string) {
  return { id, name }
}

test('空文字クエリなら全件を返す', () => {
  const employees = [employee('1', '山田太郎'), employee('2', '佐藤花子')]
  assert.deepEqual(filterEmployeesByName(employees, ''), employees)
})

test('名前の部分一致で絞り込む', () => {
  const employees = [employee('1', '山田太郎'), employee('2', '佐藤花子')]
  assert.deepEqual(filterEmployeesByName(employees, '山田'), [employee('1', '山田太郎')])
})

test('大文字小文字を区別しない', () => {
  const employees = [employee('1', 'Taro Yamada')]
  assert.deepEqual(filterEmployeesByName(employees, 'yamada'), [employee('1', 'Taro Yamada')])
})

test('一致しない場合は空配列を返す', () => {
  const employees = [employee('1', '山田太郎')]
  assert.deepEqual(filterEmployeesByName(employees, '存在しない名前'), [])
})

test('前後の空白を無視する', () => {
  const employees = [employee('1', '山田太郎')]
  assert.deepEqual(filterEmployeesByName(employees, '  山田  '), [employee('1', '山田太郎')])
})
