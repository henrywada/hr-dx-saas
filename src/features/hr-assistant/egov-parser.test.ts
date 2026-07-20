import assert from 'node:assert/strict'
import test from 'node:test'

import { extractArticleFromNode, extractLawTitle, normalizeArticleNum } from './egov-parser'
import type { EgovLawData, EgovNode } from './egov-types'

// 労働安全衛生法 第59条（e-Gov API v2 実レスポンス, elm=MainProvision-Article_59 で取得したものを採取）
const ANZEN_EISEI_ARTICLE_59: EgovNode = {
  tag: 'Article',
  attr: { Num: '59' },
  children: [
    { tag: 'ArticleCaption', attr: {}, children: ['(安全衛生教育)'] },
    { tag: 'ArticleTitle', attr: {}, children: ['第五十九条'] },
    {
      tag: 'Paragraph',
      attr: { Num: '1' },
      children: [
        { tag: 'ParagraphNum', attr: {}, children: [] },
        {
          tag: 'ParagraphSentence',
          attr: {},
          children: [
            {
              tag: 'Sentence',
              attr: { Num: '1', WritingMode: 'vertical' },
              children: [
                '事業者は、労働者を雇い入れたときは、当該労働者に対し、厚生労働省令で定めるところにより、その従事する業務に関する安全又は衛生のための教育を行なわなければならない。',
              ],
            },
          ],
        },
      ],
    },
    {
      tag: 'Paragraph',
      attr: { Num: '2' },
      children: [
        { tag: 'ParagraphNum', attr: {}, children: ['２'] },
        {
          tag: 'ParagraphSentence',
          attr: {},
          children: [
            {
              tag: 'Sentence',
              attr: { Num: '1', WritingMode: 'vertical' },
              children: ['前項の規定は、労働者の作業内容を変更したときについて準用する。'],
            },
          ],
        },
      ],
    },
  ],
}

// 号(Item)を含む合成フィクスチャ（e-Gov のタグ命名規則に基づく最小構成）
const ARTICLE_WITH_ITEMS: EgovNode = {
  tag: 'Article',
  attr: { Num: '3' },
  children: [
    { tag: 'ArticleCaption', attr: {}, children: ['(定義)'] },
    {
      tag: 'Paragraph',
      attr: { Num: '1' },
      children: [
        { tag: 'ParagraphNum', attr: {}, children: [] },
        {
          tag: 'ParagraphSentence',
          attr: {},
          children: [
            'この法律において、次の各号に掲げる用語の意義は、当該各号に定めるところによる。',
          ],
        },
        {
          tag: 'Item',
          attr: { Num: '1' },
          children: [
            { tag: 'ItemTitle', attr: {}, children: ['一'] },
            {
              tag: 'ItemSentence',
              attr: {},
              children: ['労働者 職業の種類を問わず、事業に使用される者をいう。'],
            },
          ],
        },
        {
          tag: 'Item',
          attr: { Num: '2' },
          children: [
            { tag: 'ItemTitle', attr: {}, children: ['二'] },
            {
              tag: 'ItemSentence',
              attr: {},
              children: ['賃金 労働の対償として使用者が労働者に支払うすべてのものをいう。'],
            },
          ],
        },
      ],
    },
  ],
}

// 労働基準法施行規則 第24条の2の3（e-Gov API v2 実レスポンス, elm=MainProvision-Article_24_2_3 で採取した
// Item[Num=4] 部分。号の中に細分（Subitem1: イ・ロ・ハ）を含む実データ構造。
const ITEM_WITH_SUBITEMS: EgovNode = {
  tag: 'Item',
  attr: { Num: '4' },
  children: [
    { tag: 'ItemTitle', attr: {}, children: ['四'] },
    {
      tag: 'ItemSentence',
      attr: {},
      children: [
        '使用者は、次に掲げる事項に関する労働者ごとの記録を前号の有効期間中及び当該有効期間の満了後五年間保存すること。',
      ],
    },
    {
      tag: 'Subitem1',
      attr: { Num: '1' },
      children: [
        { tag: 'Subitem1Title', attr: {}, children: ['イ'] },
        {
          tag: 'Subitem1Sentence',
          attr: {},
          children: ['法第三十八条の四第一項第四号に規定する労働者の労働時間の状況'],
        },
      ],
    },
    {
      tag: 'Subitem1',
      attr: { Num: '2' },
      children: [
        { tag: 'Subitem1Title', attr: {}, children: ['ロ'] },
        {
          tag: 'Subitem1Sentence',
          attr: {},
          children: [
            '法第三十八条の四第一項第五号に規定する労働者からの苦情の処理に関する措置の実施状況',
          ],
        },
      ],
    },
  ],
}

const PARAGRAPH_WITH_ITEM_SUBITEMS: EgovNode = {
  tag: 'Paragraph',
  attr: { Num: '1' },
  children: [
    { tag: 'ParagraphNum', attr: {}, children: [] },
    { tag: 'ParagraphSentence', attr: {}, children: ['次の事項を保存すること。'] },
    ITEM_WITH_SUBITEMS,
  ],
}

const ARTICLE_WITH_SUBITEMS: EgovNode = {
  tag: 'Article',
  attr: { Num: '24_2_3' },
  children: [
    { tag: 'ArticleCaption', attr: {}, children: ['(裁量労働制の報告)'] },
    PARAGRAPH_WITH_ITEM_SUBITEMS,
  ],
}

const ROOT: EgovNode = {
  tag: 'Ruby',
  attr: {},
  children: ['ダミー', { tag: 'Rt', attr: {}, children: ['るび'] }],
}

test('normalizeArticleNum: 全角・「第」「条」・枝番号を正規化する', () => {
  assert.equal(normalizeArticleNum('32'), '32')
  assert.equal(normalizeArticleNum('第32条'), '32')
  assert.equal(normalizeArticleNum('32の2'), '32_2')
  assert.equal(normalizeArticleNum('32-2'), '32_2')
  assert.equal(normalizeArticleNum('３２'), '32')
})

test('extractArticleFromNode: 条文全体（項番号指定なし）を抽出する', () => {
  const result = extractArticleFromNode(ANZEN_EISEI_ARTICLE_59, '59')
  assert.ok(result)
  assert.equal(result!.articleCaption, '(安全衛生教育)')
  assert.match(result!.text, /安全又は衛生のための教育を行なわなければならない。/)
  assert.match(result!.text, /前項の規定は、労働者の作業内容を変更したときについて準用する。/)
})

test('extractArticleFromNode: 項番号を指定すると当該項のみ抽出する', () => {
  const result = extractArticleFromNode(ANZEN_EISEI_ARTICLE_59, '59', 2)
  assert.ok(result)
  assert.match(result!.text, /前項の規定は、労働者の作業内容を変更したときについて準用する。/)
  assert.doesNotMatch(result!.text, /雇い入れたとき/)
})

test('extractArticleFromNode: 号番号を指定すると当該号のみ抽出する', () => {
  const result = extractArticleFromNode(ARTICLE_WITH_ITEMS, '3', 1, 2)
  assert.ok(result)
  assert.match(result!.text, /賃金 労働の対償として使用者が労働者に支払うすべてのものをいう。/)
  assert.doesNotMatch(result!.text, /労働者 職業の種類を問わず/)
})

test('extractArticleFromNode: Num属性がノードの条番号と一致しない場合は null', () => {
  const result = extractArticleFromNode(ANZEN_EISEI_ARTICLE_59, '60')
  assert.equal(result, null)
})

test('extractArticleFromNode: 存在しない項番号は null', () => {
  const result = extractArticleFromNode(ANZEN_EISEI_ARTICLE_59, '59', 9)
  assert.equal(result, null)
})

test('extractArticleFromNode: tag が Article でないノードは null', () => {
  const result = extractArticleFromNode(ROOT, '59')
  assert.equal(result, null)
})

test('extractLawTitle: revision_info.law_title を優先して返す', () => {
  const data: EgovLawData = {
    revision_info: { law_title: '労働安全衛生法' },
    law_full_text: ANZEN_EISEI_ARTICLE_59,
  }
  assert.equal(extractLawTitle(data), '労働安全衛生法')
})

test('extractLawTitle: revision_info が無ければ current_revision_info を使う', () => {
  const data: EgovLawData = {
    current_revision_info: { law_title: '労働契約法' },
    law_full_text: ANZEN_EISEI_ARTICLE_59,
  }
  assert.equal(extractLawTitle(data), '労働契約法')
})

test('normalizeArticleNum: 「第◯条の◯」形式は「条」以降も含めて枝番号を解釈する', () => {
  assert.equal(normalizeArticleNum('第32条の2'), '32_2')
})

test('normalizeArticleNum: 多段の枝番号（第◯条の◯の◯）も正しく解釈する', () => {
  assert.equal(normalizeArticleNum('24条の2の3'), '24_2_3')
  assert.equal(normalizeArticleNum('第24条の2の3'), '24_2_3')
})

test('extractArticleFromNode: 号の中の細分（Subitem1: イ・ロ・ハ）を欠落させず抽出する', () => {
  const result = extractArticleFromNode(ARTICLE_WITH_SUBITEMS, '24の2の3', 1, 4)
  assert.ok(result)
  assert.match(result!.text, /法第三十八条の四第一項第四号に規定する労働者の労働時間の状況/)
  assert.match(
    result!.text,
    /法第三十八条の四第一項第五号に規定する労働者からの苦情の処理に関する措置の実施状況/
  )
})

test('extractArticleFromNode: Subitem1Title/Sentence を深い階層の枝と誤認せず、空行を生成しない', () => {
  // "Subitem1Title"/"Subitem1Sentence" は startsWith('Subitem') が真になるため、
  // 誤って自分自身のTitle/Sentenceノードを子の枝として再帰してしまう回帰を防ぐテスト。
  const result = extractArticleFromNode(ARTICLE_WITH_SUBITEMS, '24の2の3', 1, 4)
  assert.ok(result)
  const lines = result!.text.split('\n')
  assert.equal(
    lines.some(l => l.trim() === ''),
    false,
    `空行または空白のみの行が含まれている: ${JSON.stringify(lines)}`
  )
})

test('extractArticleFromNode: 条文全体抽出でも Item 配下の Subitem を含める', () => {
  const result = extractArticleFromNode(ARTICLE_WITH_SUBITEMS, '24の2の3')
  assert.ok(result)
  assert.match(result!.text, /イ.*法第三十八条の四第一項第四号/)
  assert.match(result!.text, /ロ.*法第三十八条の四第一項第五号/)
})
