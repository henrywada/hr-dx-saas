import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { filterUnusedForAlert, processStatusLabel } from './process-status'

describe('processStatusLabel', () => {
  it('maps unused/used/alert_ignored to Japanese labels', () => {
    assert.equal(processStatusLabel('unused'), '未使用')
    assert.equal(processStatusLabel('used'), '使用済')
    assert.equal(processStatusLabel('alert_ignored'), 'アラート無視')
  })
})

describe('filterUnusedForAlert', () => {
  it('keeps only unused rows', () => {
    const rows = [
      { id: '1', process_status: 'unused' as const },
      { id: '2', process_status: 'used' as const },
      { id: '3', process_status: 'alert_ignored' as const },
    ]
    assert.deepEqual(filterUnusedForAlert(rows), [{ id: '1', process_status: 'unused' }])
  })
})
