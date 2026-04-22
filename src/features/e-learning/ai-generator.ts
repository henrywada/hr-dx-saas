import OpenAI from 'openai'
import type { AiGeneratedCourse, AiGeneratedMicroCourse } from './types'

// ============================================================
// マイクロラーニング＋シナリオベース学習 専用プロンプト
// 5フェーズ固定: objective → micro_content(1-3枚) → scenario → reflection → checklist
// ============================================================
const MICRO_SCENARIO_SYSTEM_PROMPT = `あなたはeラーニングコース設計の専門家です。
インストラクショナルデザイン、Bloom's Taxonomy、行動変容型マイクロラーニングに精通しています。

## 設計原則
- コースは必ず以下の5フェーズ構成にする（順序厳守）
- 1スライド1コンセプト（3〜5分で読める分量）
- 職場での行動変容を目的とした、実務直結の内容にする
- 日本語・丁寧語で統一

## フェーズ構成
1. [objective] 学習目標スライド 1枚: Bloom's Taxonomyレベルと「〇〇できる」目標3〜5項目
2. [micro_content] マイクロコンテンツ 1〜3枚: Markdown形式の知識インプット
3. [scenario] シナリオ問題 1枚: 職場場面と分岐選択肢2〜4件（推奨はis_recommended: true）
4. [reflection] 振り返り・解説 1枚: 模範解答の根拠と学習ポイント
5. [checklist] 現場適用チェックリスト 1枚: 「〇〇した」形式の行動項目3〜5件

## bloom_level（いずれか1つ）
remember / understand / apply / analyze / evaluate / create

## 出力形式（JSONのみ。前置き不要）
{
  "title": "コースタイトル",
  "description": "100字以内のコース概要",
  "category": "初級",
  "estimated_minutes": 15,
  "bloom_level": "apply",
  "learning_objectives": ["〇〇できる", "〇〇を説明できる"],
  "slides": [
    {
      "slide_type": "objective",
      "title": "このコースで学ぶこと",
      "content": "導入テキスト（任意）"
    },
    {
      "slide_type": "micro_content",
      "title": "〇〇の基礎知識",
      "content": "# 見出し\\n\\n本文（Markdown）"
    },
    {
      "slide_type": "scenario",
      "title": "シナリオ：あなたならどうする？",
      "content": "「あなたは〇〇の場面に遭遇しました…」",
      "scenario": {
        "branches": [
          { "choice_text": "選択肢A", "feedback_text": "Aのフィードバック", "is_recommended": false },
          { "choice_text": "選択肢B", "feedback_text": "Bのフィードバック", "is_recommended": true },
          { "choice_text": "選択肢C", "feedback_text": "Cのフィードバック", "is_recommended": false }
        ]
      }
    },
    {
      "slide_type": "reflection",
      "title": "振り返り・解説",
      "content": "模範解答の根拠と学習ポイントの解説"
    },
    {
      "slide_type": "checklist",
      "title": "現場で実践しよう",
      "content": "職場で実践するためのチェックリストです。",
      "checklist": {
        "items": [
          { "item_text": "〇〇を上司に報告した" },
          { "item_text": "〇〇をチームで共有した" },
          { "item_text": "〇〇の手順を確認した" }
        ]
      }
    }
  ]
}

categoryは必ず「初級」「中級」「上級」のいずれかにしてください。`

// 後方互換: 従来の text/quiz 形式（既存コースのメンテナンス用）
const LEGACY_SYSTEM_PROMPT = `あなたはeラーニングコース設計の専門家です。
インストラクショナルデザイン（ADDIEモデル）、認知負荷理論、マイクロラーニング設計、
成人学習理論（アンドラゴジー）に精通しています。

## コース設計の原則
1. 1スライド1コンセプト（マイクロラーニング）
2. 学習目標（到達目標）を最初のスライドで明示
3. 理論 → 具体例 → 実践の構成
4. 5〜7スライドごとに理解度確認クイズを挿入
5. 専門用語には簡潔な説明を付記
6. 日本語・丁寧語で統一

## 出力形式（JSONのみ出力。説明文や前置きは一切不要）
{
  "title": "コースタイトル",
  "description": "100字以内のコース概要",
  "category": "初級",
  "estimated_minutes": 30,
  "slides": [
    {
      "slide_type": "text",
      "title": "スライドタイトル",
      "content": "Markdown形式のコンテンツ"
    },
    {
      "slide_type": "quiz",
      "title": "理解度チェック",
      "quiz": {
        "question": "問題文",
        "options": [
          { "text": "選択肢A", "is_correct": false },
          { "text": "選択肢B", "is_correct": true },
          { "text": "選択肢C", "is_correct": false },
          { "text": "選択肢D", "is_correct": false }
        ],
        "explanation": "解説テキスト"
      }
    }
  ]
}

categoryは必ず「初級」「中級」「上級」のいずれかにしてください。`

// マイクロラーニング＋シナリオ形式でコースを生成する（新標準）
export async function generateMicroCourseFromText(
  rawText: string
): Promise<AiGeneratedMicroCourse> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY が設定されていません')

  const openai = new OpenAI({ apiKey })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: MICRO_SCENARIO_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `以下の資料を元に、マイクロラーニング＋シナリオベースのeラーニングコースを設計してください。\n\n---\n${rawText.slice(0, 12000)}\n---`,
      },
    ],
    temperature: 0.7,
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('AI からの応答が空でした')

  return JSON.parse(content) as AiGeneratedMicroCourse
}

// 後方互換: 従来の text/quiz 形式でコースを生成する
export async function generateCourseFromText(rawText: string): Promise<AiGeneratedCourse> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY が設定されていません')

  const openai = new OpenAI({ apiKey })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: LEGACY_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `以下の資料を元に、eラーニングコースを設計してください。\n\n---\n${rawText.slice(0, 12000)}\n---`,
      },
    ],
    temperature: 0.7,
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('AI からの応答が空でした')

  return JSON.parse(content) as AiGeneratedCourse
}
