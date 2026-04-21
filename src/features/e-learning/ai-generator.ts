import OpenAI from 'openai'
import type { AiGeneratedCourse } from './types'

const SYSTEM_PROMPT = `あなたはeラーニングコース設計の専門家です。
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

export async function generateCourseFromText(rawText: string): Promise<AiGeneratedCourse> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY が設定されていません')

  const openai = new OpenAI({ apiKey })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
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
