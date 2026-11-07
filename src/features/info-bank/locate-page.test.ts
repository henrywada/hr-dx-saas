import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { locatePage } from './locate-page'

const pages = [
  { num: 1, text: '第1章 総則\n この規則は従業員の就業に関する事項を定める。' },
  {
    num: 2,
    text: '第2章 採用\n 採用時に提出する書類は、住民票記載事項証明書、\n 運転免許証の写しとする。',
  },
  { num: 3, text: '第3章 休暇\n 年次有給休暇は法令の定めるところによる。' },
]

describe('locatePage', () => {
  it('改行や空白の違いを無視して抜粋のページを返す', () => {
    assert.equal(
      locatePage(pages, ['採用時に提出する書類は、住民票記載事項証明書、運転免許証の写し']),
      2
    )
  })

  it('複数の抜粋があれば最も前のページを返す', () => {
    assert.equal(locatePage(pages, ['年次有給休暇は法令の定める', '従業員の就業に関する事項']), 1)
  })

  it('見つからない・空の抜粋は null', () => {
    assert.equal(locatePage(pages, ['まったく別の文章です']), null)
    assert.equal(locatePage(pages, ['   ']), null)
    assert.equal(locatePage([], ['採用']), null)
  })

  it('短い抜粋でも先頭で照合できる', () => {
    assert.equal(locatePage(pages, ['第3章 休暇']), 3)
  })

  it('抜粋の先頭がページ境界のマーカーで外れても、奥の断片で拾える', () => {
    const excerpt =
      '-- 2 of 3 --' + ' 採用時に提出する書類は、住民票記載事項証明書、運転免許証の写しとする。'
    assert.equal(locatePage(pages, [excerpt]), 2)
  })
})
