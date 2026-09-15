import { z } from 'zod'
import type { PicturePriority } from '@/lib/picture-report/priority'

// 写真レポートの件名（マスタ）
export type PictureSendSubject = {
  id: string
  label: string
  created_at: string
  updated_at: string
}

// 写真レポート送信行（DB行）
export type PictureSendRow = {
  id: string
  user_id: string
  user_email: string
  subject_text: string
  body_text: string
  priority: PicturePriority
  storage_path: string
  created_at: string
}

// アルバム表示用（送信行 + サムネイルURL）
export type AlbumItem = PictureSendRow & {
  thumbnailUrl: string | null
}

// アルバムスコープ（自分/チーム）
export type AlbumScope = 'own' | 'team'

// Server Action の戻り値型
export type PictureReportActionResult = { success: true } | { success: false; error: string }

// 件名マスタ新規作成スキーマ
export const createSubjectSchema = z.object({
  label: z.string().trim().min(1, '件名を入力してください').max(100),
})

// 件名マスタ更新スキーマ
export const updateSubjectSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(1, '件名を入力してください').max(100),
})

// 件名マスタ削除スキーマ
export const deleteSubjectSchema = z.object({
  id: z.string().uuid(),
})

// 写真送信スキーマ
export const sendPictureSchema = z.object({
  subjectId: z.string().uuid().nullable(),
  subjectText: z.string().trim().min(1, '件名を入力してください').max(100),
  bodyText: z.string().max(2000),
  priority: z.enum(['high', 'medium', 'low']),
})

// 写真送信行の本文更新スキーマ
export const updateSendBodySchema = z.object({
  id: z.string().uuid(),
  bodyText: z.string().max(2000),
})

// 写真送信行削除スキーマ
export const deleteSendSchema = z.object({
  id: z.string().uuid(),
})
