// src/features/condition-checkin/types.ts

import { z } from 'zod'

export interface ConditionCheckin {
  id: string
  tenant_id: string
  employee_id: string
  score: number
  memo: string | null
  checkin_date: string
  created_at: string
}

/** 自分の推移グラフ用の1点。欠損日は score: null（連続性チェック・グラフ描画用） */
export interface ConditionTrendPoint {
  checkin_date: string
  score: number | null
}

/** 部署別匿名集計（SECURITY DEFINER 関数 get_division_condition_trend の戻り値） */
export interface DivisionConditionTrendPoint {
  checkin_date: string
  avg_score: number | null
  respondent_count: number
}

export interface DivisionOption {
  id: string
  name: string
}

/**
 * 1タップ記録の入力検証スキーマ。
 * Next.js の 'use server' ファイルは async 関数以外を export できないため、
 * actions.ts ではなくこちらに定義する（相談機能で踏んだバグの再発防止）。
 */
export const submitConditionCheckinSchema = z.object({
  score: z.number().int().min(1).max(5),
  memo: z.string().max(200).optional(),
})

export type SubmitConditionCheckinInput = z.infer<typeof submitConditionCheckinSchema>
