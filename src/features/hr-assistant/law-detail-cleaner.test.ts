import assert from 'node:assert/strict'
import test from 'node:test'

import { stripSummaryBoilerplate } from './law-detail-cleaner'

test('要約プロンプトの指示文がそのまま見出しになったものを除去する', () => {
  const input = [
    '2026年（令和8年）10月1日から施行されます。',
    '',
    '### 不確かな点は書かない（推測禁止）',
    '現時点では、具体的な罰則規定は公布を待つ必要があります。',
  ].join('\n')

  const cleaned = stripSummaryBoilerplate(input)

  assert.ok(!cleaned.includes('不確かな点は書かない'))
  assert.ok(!cleaned.includes('推測禁止'))
  // 見出し直後の本文は残す
  assert.ok(cleaned.includes('現時点では、具体的な罰則規定は公布を待つ必要があります。'))
  assert.ok(cleaned.includes('2026年（令和8年）10月1日から施行されます。'))
})

test('「数値（料率・金額・期限等）があれば明記」の指示見出しも除去する', () => {
  const input = '### 数値（料率・金額・期限等）があれば明記\n* 口座残高上限額: 100万円以下'

  const cleaned = stripSummaryBoilerplate(input)

  assert.ok(!cleaned.includes('があれば明記'))
  assert.ok(cleaned.includes('口座残高上限額: 100万円以下'))
})

test('全文書で重複する定型見出しを除去する', () => {
  const input = '### 何が変わったか／現状の制度内容\n労働者数50人未満の事業場が義務化されます。'

  const cleaned = stripSummaryBoilerplate(input)

  assert.ok(!cleaned.includes('### 何が変わったか'))
  assert.ok(cleaned.includes('労働者数50人未満の事業場が義務化されます。'))
})

test('太字（**...**）形式の定型見出しも除去する', () => {
  const input = [
    '握する。',
    '',
    '**数値（料率・金額・期限等）があれば明記**',
    '*   **時間外労働の上限**: 月45時間、年360時間（原則）。',
  ].join('\n')

  const cleaned = stripSummaryBoilerplate(input)

  assert.ok(!cleaned.includes('があれば明記'))
  // 本文と、本文中の通常の太字は保持する
  assert.ok(cleaned.includes('**時間外労働の上限**: 月45時間、年360時間（原則）。'))
  assert.ok(cleaned.includes('握する。'))
})

test('太字形式の「不確かな点は書かない（推測禁止）」も除去する', () => {
  const input = '**不確かな点は書かない（推測禁止）**\n現時点では公布を待つ必要があります。'

  const cleaned = stripSummaryBoilerplate(input)

  assert.ok(!cleaned.includes('推測禁止'))
  assert.ok(cleaned.includes('現時点では公布を待つ必要があります。'))
})

test('【...】括弧形式の定型見出しも除去する', () => {
  const input =
    '【数値（料率・金額・期限等）があれば明記】\n・実施頻度：年1回\n\n【不確かな点は書かない（推測禁止）】\n特になし。'

  const cleaned = stripSummaryBoilerplate(input)

  assert.ok(!cleaned.includes('があれば明記'))
  assert.ok(!cleaned.includes('推測禁止'))
  assert.ok(cleaned.includes('・実施頻度：年1回'))
})

test('装飾なし＋末尾コロン形式の定型見出しも除去する', () => {
  const input =
    '不確かな点は書かない（推測禁止）:\n本情報源は全体像を示すものです。\n\n数値（料率・金額・期限等）があれば明記:\n*   **時間外労働の上限規制**：月45時間。'

  const cleaned = stripSummaryBoilerplate(input)

  assert.ok(!cleaned.includes('推測禁止'))
  assert.ok(!cleaned.includes('があれば明記'))
  assert.ok(cleaned.includes('本情報源は全体像を示すものです。'))
  assert.ok(cleaned.includes('*   **時間外労働の上限規制**：月45時間。'))
})

test('コロンが太字の内側にある形式（**ラベル:**）も除去する', () => {
  const input = [
    '義務付けられています。',
    '',
    '**人事が取るべき実務対応:**',
    '*   自社の就業規則が法定労働時間に適合しているか確認する。',
    '',
    '**対象企業・対象者:**',
    '原則として全ての企業および労働者が対象となります。',
  ].join('\n')

  const cleaned = stripSummaryBoilerplate(input)

  assert.ok(!cleaned.includes('人事が取るべき実務対応'))
  assert.ok(!cleaned.includes('対象企業・対象者'))
  assert.ok(cleaned.includes('*   自社の就業規則が法定労働時間に適合しているか確認する。'))
  assert.ok(cleaned.includes('原則として全ての企業および労働者が対象となります。'))
})

test('定型句を含む「地の文」は絶対に削らない', () => {
  const input = [
    '人事が取るべき実務対応は以下の3ステップです。',
    '対象企業・対象者を確認したうえで、就業規則を改定してください。',
  ].join('\n')

  const cleaned = stripSummaryBoilerplate(input)

  // 行がラベルだけではないため、文として保持されなければならない
  assert.equal(cleaned, input)
})

test('通常の見出しや本文は保持する', () => {
  const input = ['**2. 連続勤務規制**', '最長48連勤が可能となる状況が問題視されています。'].join(
    '\n'
  )

  const cleaned = stripSummaryBoilerplate(input)

  assert.equal(cleaned, input)
})

test('除去後に生じる余分な空行を詰める', () => {
  const input = 'A。\n\n### 推測禁止\n\n\nB。'

  const cleaned = stripSummaryBoilerplate(input)

  assert.ok(!/\n{3,}/.test(cleaned), '3行以上の連続改行が残っている')
  assert.ok(cleaned.includes('A。'))
  assert.ok(cleaned.includes('B。'))
})

test('空文字・未定義でも安全に動作する', () => {
  assert.equal(stripSummaryBoilerplate(''), '')
  assert.equal(stripSummaryBoilerplate(null as unknown as string), '')
})
