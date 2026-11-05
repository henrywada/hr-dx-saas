import type { INFO_BANK_CATEGORIES } from './constants'

/** ユーザーが指定する検索方式 */
export type SearchMode = 'auto' | 'text' | 'rag'

/** 実際に使われた検索方式（フォールバック時は hybrid） */
export type ModeUsed = 'text' | 'rag' | 'hybrid'

export type IngestStatus = 'uploaded' | 'processing' | 'ready' | 'failed'

export type InfoBankCategory = (typeof INFO_BANK_CATEGORIES)[number]

/** 検索でヒットした 1 チャンク */
export interface InfoBankHit {
  chunkId: string
  documentId: string
  title: string
  content: string
  score: number
  via: 'text' | 'rag' | 'both'
}

export interface InfoBankAnswer {
  answerable: boolean
  answer: string
  citations: InfoBankHit[]
  modeUsed: ModeUsed
}
