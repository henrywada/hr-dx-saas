import assert from 'node:assert/strict'
import test from 'node:test'

import { prepareDeliveryScan } from './delivery-scan'

const VALID_COMPANY_ID = '11111111-1111-4111-8111-111111111111'
const USER_QR = 'LOT:LOT-20260820-0001,MFG:2026-08-20'

test('NOなしの製造ロットQRからロット番号を取り出し出荷スキャンできる', () => {
  const result = prepareDeliveryScan({
    decodedText: USER_QR,
    selectedCompanyId: VALID_COMPANY_ID,
    quantity: 1,
    expirationDate: '2028-08-20',
  })
  assert.equal(result.ok, true)
  assert.equal(result.lotNo, 'LOT-20260820-0001')
})

test('出荷先未選択でも読み取ったロット番号は返し、エラーにする', () => {
  const result = prepareDeliveryScan({
    decodedText: USER_QR,
    selectedCompanyId: '',
    quantity: 1,
    expirationDate: '2028-08-20',
  })
  assert.equal(result.ok, false)
  assert.equal(result.lotNo, 'LOT-20260820-0001')
  assert.match(result.error, /出荷先/)
})
