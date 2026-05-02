import assert from 'node:assert/strict'
import test from 'node:test'

import { buildEstablishmentProgressStats } from './progress-establishments'

test('builds progress counts and not-submitted employees by establishment', () => {
  const stats = buildEstablishmentProgressStats({
    establishments: [
      { id: 'tokyo', name: '東京本社' },
      { id: 'osaka', name: '大阪支店' },
    ],
    employees: [
      { id: 'emp-1' },
      { id: 'emp-2' },
      { id: 'emp-3' },
      { id: 'emp-4' },
    ],
    submittedEmployeeIds: new Set(['emp-1', 'emp-3']),
    submissions: [
      { employee_id: 'emp-1', status: 'submitted', consent_to_employer: true },
      { employee_id: 'emp-3', status: 'submitted', consent_to_employer: false },
    ],
    employeeEstablishmentMap: new Map([
      ['emp-1', 'tokyo'],
      ['emp-2', 'tokyo'],
      ['emp-3', 'osaka'],
      ['emp-4', null],
    ]),
  })

  assert.deepEqual(stats, [
    {
      id: 'tokyo',
      name: '東京本社',
      submitted: 1,
      notSubmitted: 1,
      inProgress: 0,
      rate: 50,
      total: 2,
    },
    {
      id: 'osaka',
      name: '大阪支店',
      submitted: 1,
      notSubmitted: 0,
      inProgress: 1,
      rate: 100,
      total: 1,
    },
    {
      id: 'unassigned',
      name: '拠点未割当',
      submitted: 0,
      notSubmitted: 1,
      inProgress: 0,
      rate: 0,
      total: 1,
    },
  ])
})
