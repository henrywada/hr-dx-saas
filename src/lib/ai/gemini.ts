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

/** 動画コンテンツ（Files API アップロード後の URI、または YouTube URL）を prompt に添付する */
export interface GeminiVideoPart {
  fileUri: string
  mimeType?: string
}

export interface GeminiGenerateOptions {
  /** 使用モデル（GEMINI_PRO_MODEL / GEMINI_FLASH_MODEL 等） */
  model: string
  /** システム指示（OpenAI の system ロール相当） */
  system?: string
  /** ユーザープロンプト本文 */
  prompt: string
  /** 参考動画（YouTube URL や Files API アップロード済みファイル）を併せて渡す */
  videoPart?: GeminiVideoPart
  temperature?: number
  /** 最大出力トークン数（OpenAI の max_tokens 相当） */
  maxOutputTokens?: number
  /** JSON 形式での出力を強制する（OpenAI の response_format: json_object 相当） */
  json?: boolean
  /** 構造化出力スキーマ（OpenAI の json_schema 相当） */
  responseJsonSchema?: unknown
  /** API 呼び出しタイムアウト（ミリ秒）。既定 120 秒 */
  timeoutMs?: number
}

const DEFAULT_GEMINI_TIMEOUT_MS = 120_000
const GEMINI_FILE_POLL_INTERVAL_MS = 3_000
const GEMINI_FILE_PROCESSING_TIMEOUT_MS = 5 * 60_000

/**
 * 単一ターンのテキスト/JSON 生成。応答テキストを返す。
 * マルチターン（会話履歴）が必要な場合は getGeminiClient() を直接使うこと。
 */
export async function generateGeminiContent(opts: GeminiGenerateOptions): Promise<string> {
  const ai = getGeminiClient()
  const timeoutMs = opts.timeoutMs ?? DEFAULT_GEMINI_TIMEOUT_MS

  const contents = opts.videoPart
    ? [
        { fileData: { fileUri: opts.videoPart.fileUri, mimeType: opts.videoPart.mimeType } },
        { text: opts.prompt },
      ]
    : opts.prompt

  const generatePromise = ai.models.generateContent({
    model: opts.model,
    contents,
    config: {
      ...(opts.system ? { systemInstruction: opts.system } : {}),
      ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
      ...(opts.maxOutputTokens != null ? { maxOutputTokens: opts.maxOutputTokens } : {}),
      ...(opts.json || opts.responseJsonSchema ? { responseMimeType: 'application/json' } : {}),
      ...(opts.responseJsonSchema ? { responseJsonSchema: opts.responseJsonSchema } : {}),
    },
  })

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`Gemini API が ${timeoutMs}ms 以内に応答しませんでした`)),
      timeoutMs
    )
  })

  let response
  try {
    response = await Promise.race([generatePromise, timeoutPromise])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }

  const text = response.text
  if (!text) {
    throw new Error('AI からの応答が空でした')
  }
  return text
}

/**
 * 動画バイナリを Gemini Files API にアップロードし、解析可能（ACTIVE）になるまで待つ。
 * 返された fileUri は generateGeminiContent の videoPart にそのまま渡せる。
 */
export async function uploadVideoToGeminiFiles(
  buffer: Buffer,
  mimeType: string
): Promise<GeminiVideoPart> {
  const ai = getGeminiClient()
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType })

  const uploaded = await ai.files.upload({ file: blob, config: { mimeType } })
  if (!uploaded.name) {
    throw new Error('Gemini への動画アップロードに失敗しました')
  }

  const startedAt = Date.now()
  let file = uploaded
  while (file.state === 'PROCESSING') {
    if (Date.now() - startedAt > GEMINI_FILE_PROCESSING_TIMEOUT_MS) {
      throw new Error('動画の解析準備がタイムアウトしました')
    }
    await new Promise(resolve => setTimeout(resolve, GEMINI_FILE_POLL_INTERVAL_MS))
    file = await ai.files.get({ name: uploaded.name })
  }

  if (file.state === 'FAILED') {
    throw new Error('動画の解析準備に失敗しました')
  }
  if (!file.uri) {
    throw new Error('アップロードした動画の URI を取得できませんでした')
  }

  return { fileUri: file.uri, mimeType: file.mimeType ?? mimeType }
}
