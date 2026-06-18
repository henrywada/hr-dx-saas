import { GoogleGenAI } from '@google/genai'

/**
 * Google Gemini クライアントとモデル定義の単一ソース。
 * OpenAI からの移行に伴い、チャット生成・埋め込みは全てここを経由する。
 *
 * モデル対応付け（OpenAI → Gemini）:
 *   gpt-4o      → gemini-2.5-pro   （品質重視）
 *   gpt-4o-mini → gemini-2.5-flash （軽量・安価）
 *   text-embedding-3-small → gemini-embedding-001（出力次元 1536 指定）
 */
export const GEMINI_PRO_MODEL = 'gemini-2.5-pro'
export const GEMINI_FLASH_MODEL = 'gemini-2.5-flash'
export const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001'

let client: GoogleGenAI | null = null

/**
 * Gemini クライアントを取得する（プロセス内でシングルトン）。
 * API キー未設定時は明示的に例外を投げる。
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY が設定されていません')
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey })
  }
  return client
}

export interface GeminiGenerateOptions {
  /** 使用モデル（GEMINI_PRO_MODEL / GEMINI_FLASH_MODEL 等） */
  model: string
  /** システム指示（OpenAI の system ロール相当） */
  system?: string
  /** ユーザープロンプト本文 */
  prompt: string
  temperature?: number
  /** 最大出力トークン数（OpenAI の max_tokens 相当） */
  maxOutputTokens?: number
  /** JSON 形式での出力を強制する（OpenAI の response_format: json_object 相当） */
  json?: boolean
  /** 構造化出力スキーマ（OpenAI の json_schema 相当） */
  responseJsonSchema?: unknown
}

/**
 * 単一ターンのテキスト/JSON 生成。応答テキストを返す。
 * マルチターン（会話履歴）が必要な場合は getGeminiClient() を直接使うこと。
 */
export async function generateGeminiContent(opts: GeminiGenerateOptions): Promise<string> {
  const ai = getGeminiClient()
  const response = await ai.models.generateContent({
    model: opts.model,
    contents: opts.prompt,
    config: {
      ...(opts.system ? { systemInstruction: opts.system } : {}),
      ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
      ...(opts.maxOutputTokens != null ? { maxOutputTokens: opts.maxOutputTokens } : {}),
      ...(opts.json || opts.responseJsonSchema ? { responseMimeType: 'application/json' } : {}),
      ...(opts.responseJsonSchema ? { responseJsonSchema: opts.responseJsonSchema } : {}),
    },
  })
  const text = response.text
  if (!text) {
    throw new Error('AI からの応答が空でした')
  }
  return text
}
