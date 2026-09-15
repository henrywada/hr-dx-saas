import assert from 'node:assert/strict'
import test from 'node:test'

import { tokyoToday } from '@/lib/documents/tokyoDate'

test('returns Tokyo calendar date for a UTC instant', () => {
  const result = tokyoToday(new Date('2026-08-27T16:00:00Z'))
  assert.equal(result, '2026-08-28')
})
