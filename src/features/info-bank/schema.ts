import { z } from 'zod'

import { INFO_BANK_CATEGORIES } from './constants'

const MAX_LIST_ITEMS = 20
const MAX_ITEM_LENGTH = 40

/** 前後の空白を除き、空文字と重複を取り除いたうえで件数・長さを検証する */
const normalizedList = z
  .array(z.string())
  .default([])
  .transform(items => [...new Set(items.map(s => s.trim()).filter(s => s.length > 0))])
  .pipe(z.array(z.string().max(MAX_ITEM_LENGTH)).max(MAX_LIST_ITEMS))

/** 資料登録・編集時のメタデータ（検索用のキー項目） */
export const documentMetaSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'タイトルを入力してください')
    .max(200, 'タイトルは200文字以内です'),
  category: z.enum(INFO_BANK_CATEGORIES).default('その他'),
  tags: normalizedList,
  keywords: normalizedList,
  summary: z.string().trim().max(1000, '要約は1000文字以内です').default(''),
})

export type DocumentMetaInput = z.input<typeof documentMetaSchema>
export type DocumentMeta = z.output<typeof documentMetaSchema>

/** Zod のエラーを画面表示用の 1 行に整える */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? '入力内容を確認してください'
}
