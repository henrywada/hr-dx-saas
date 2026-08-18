import assert from 'node:assert/strict'
import test from 'node:test'

import {
  JAISH_BASE_URL,
  resolveJaishUrl,
  toJaishHits,
  toLawArticleDocument,
  toMhlwDocument,
  toMhlwHits,
  toSaiketsuHits,
  toSearchLawHits,
} from './normalize'

test('toSearchLawHits: e-Gov 検索結果を ResearchHit へ写像する', () => {
  const hits = toSearchLawHits({
    results: [
      {
        lawTitle: '労働基準法',
        lawId: '322AC0000000049',
        lawNum: '昭和二十二年法律第四十九号',
        lawType: 'Act',
        egovUrl: 'https://laws.e-gov.go.jp/law/322AC0000000049',
      },
    ],
  })

  assert.equal(hits.length, 1)
  assert.equal(hits[0].id, '322AC0000000049')
  assert.equal(hits[0].title, '労働基準法')
  assert.equal(hits[0].identifier, '昭和二十二年法律第四十九号')
  assert.equal(hits[0].sourceUrl, 'https://laws.e-gov.go.jp/law/322AC0000000049')
  assert.deepEqual(hits[0].ref, { kind: 'law_toc', lawName: '労働基準法' })
})

test('toMhlwHits: 厚労省通達の検索結果を写像し、番号と日付を保持する', () => {
  const hits = toMhlwHits({
    results: [
      {
        title: '賃金不払残業の解消を図るために講ずべき措置等に関する指針について',
        dataId: '00tb2035',
        date: '平成15年05月23日',
        shubetsu: '基発第523004号',
      },
    ],
  })

  assert.equal(hits.length, 1)
  assert.equal(hits[0].id, '00tb2035')
  assert.equal(hits[0].identifier, '基発第523004号')
  assert.equal(hits[0].dateLabel, '平成15年05月23日')
  assert.deepEqual(hits[0].ref, { kind: 'mhlw_tsutatsu', dataId: '00tb2035' })
})

test('resolveJaishUrl: 相対パスを絶対URLへ変換し、絶対URLはそのまま返す', () => {
  assert.equal(
    resolveJaishUrl('/anzen/hor/hombun/x.htm'),
    `${JAISH_BASE_URL}/anzen/hor/hombun/x.htm`
  )
  assert.equal(resolveJaishUrl('https://example.test/a.htm'), 'https://example.test/a.htm')
})

test('toJaishHits: 安衛通達の相対URLを絶対URLへ正規化する', () => {
  const hits = toJaishHits({
    results: [
      {
        title: 'ストレスチェック制度の施行を踏まえた当面のメンタルヘルス対策の推進について',
        number: '基発0331第31号',
        date: '令和4年3月31日',
        url: '/anzen/hor/hombun/hor1-63/hor1-63-1-1-0.htm',
      },
    ],
  })

  const expectedUrl = `${JAISH_BASE_URL}/anzen/hor/hombun/hor1-63/hor1-63-1-1-0.htm`
  assert.equal(hits.length, 1)
  assert.equal(hits[0].sourceUrl, expectedUrl)
  assert.deepEqual(hits[0].ref, { kind: 'jaish_tsutatsu', url: expectedUrl })
})

test('toSaiketsuHits: 裁決事例を写像し、要旨を summary に入れる', () => {
  const hits = toSaiketsuHits({
    results: [
      {
        collectionNo: 102,
        taxType: '所得税法関係',
        category: '（同業者率を用いた推計の合理性）',
        summary: '原処分庁が推計の基礎とした…',
        date: '令和7年4月11日',
        caseUrl: 'https://www.kfs.go.jp/service/JP/102/01/index.html',
      },
    ],
  })

  assert.equal(hits.length, 1)
  assert.equal(hits[0].title, '（同業者率を用いた推計の合理性）')
  assert.equal(hits[0].identifier, '裁決事例集 第102集 所得税法関係')
  assert.equal(hits[0].dateLabel, '令和7年4月11日')
  assert.match(hits[0].summary, /原処分庁/)
  assert.deepEqual(hits[0].ref, {
    kind: 'saiketsu',
    url: 'https://www.kfs.go.jp/service/JP/102/01/index.html',
  })
})

test('toLawArticleDocument: 条見出しがある場合はタイトルに含める', () => {
  const doc = toLawArticleDocument(
    {
      lawTitle: '労働基準法',
      article: '36',
      articleCaption: '（時間外及び休日の労働）',
      text: '#### （時間外及び休日の労働）\n**第三十六条**\n\n使用者は…',
      egovUrl: 'https://laws.e-gov.go.jp/law/322AC0000000049',
    },
    '2026-08-18T09:00:00.000Z'
  )

  assert.equal(doc.title, '労働基準法 第36条（時間外及び休日の労働）')
  assert.equal(doc.identifier, '第36条')
  assert.equal(doc.fetchedAt, '2026-08-18T09:00:00.000Z')
  assert.match(doc.body, /使用者は/)
})

test('toLawArticleDocument: 条見出しが空の場合はタイトルに括弧を付けない', () => {
  const doc = toLawArticleDocument(
    {
      lawTitle: '法人税法',
      article: '22',
      articleCaption: '',
      text: '**第二十二条**\n\n内国法人の…',
      egovUrl: 'https://laws.e-gov.go.jp/law/340AC0000000034',
    },
    '2026-08-18T09:00:00.000Z'
  )

  assert.equal(doc.title, '法人税法 第22条')
})

test('toMhlwDocument: 通達本文を ResearchDocument へ写像する', () => {
  const doc = toMhlwDocument(
    {
      title: '賃金不払残業の解消を図るために講ずべき措置等に関する指針について',
      body: '## 指針\n\n(平成15年5月23日)',
      dataId: '00tb2035',
      url: 'https://www.mhlw.go.jp/web/t_doc?dataId=00tb2035',
    },
    '2026-08-18T09:00:00.000Z'
  )

  assert.equal(doc.identifier, '00tb2035')
  assert.equal(doc.sourceUrl, 'https://www.mhlw.go.jp/web/t_doc?dataId=00tb2035')
  assert.equal(doc.fetchedAt, '2026-08-18T09:00:00.000Z')
})
