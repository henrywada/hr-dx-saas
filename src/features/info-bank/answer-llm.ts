import { CHAT_MODEL } from '@/features/inquiry-chat/constants'

import { ANSWER_JSON_SCHEMA } from './answer'

const MAX_OUTPUT_TOKENS = 1024

/** requestAnswer が必要とする最小のクライアント（テストで差し替え可能にするため） */
export interface AnswerClient {
  models: {
    generateContent: (args: {
      model: string
      contents: string
      config: Record<string, unknown>
    }) => Promise<{ text?: string }>
  }
}

/**
 * 資料の抜粋だけを根拠に回答を生成する。
 * - tools は渡さない（Google 検索グラウンディング等の外部参照を一切使わない）
 * - Gemini 2.5 系は thinking が既定で有効になり出力トークンを消費するため thinkingBudget: 0 にする
 */
export async function requestAnswer(
  client: AnswerClient,
  input: { system: string; prompt: string }
): Promise<string> {
  const res = await client.models.generateContent({
    model: CHAT_MODEL,
    contents: input.prompt,
    config: {
      systemInstruction: input.system,
      temperature: 0,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: 'application/json',
      responseJsonSchema: ANSWER_JSON_SCHEMA,
    },
  })
  if (!res.text) throw new Error('AI からの応答が空でした')
  return res.text
}
