import assert from 'node:assert/strict'
import test from 'node:test'

import { escapeCsvCell, sanitizeCsvFormula } from '@/lib/csv'

test('sanitizeCsvFormula は数式先頭をエスケープする', () => {
  assert.equal(sanitizeCsvFormula('=1+1'), "'=1+1")
  assert.equal(sanitizeCsvFormula('+123'), "'+123")
  assert.equal(sanitizeCsvFormula('通常テキスト'), '通常テキスト')
})

test('escapeCsvCell はカンマと数式をエスケープする', () => {
  assert.equal(escapeCsvCell('a,b'), '"a,b"')
  assert.equal(escapeCsvCell('say "hi"'), '"say ""hi"""')
  assert.equal(escapeCsvCell('=cmd'), "'=cmd")
})
