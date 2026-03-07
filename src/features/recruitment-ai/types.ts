/** TalentDraft AI ドメイン固有の型定義 */

import { PlanType } from '@/types/auth';

// ─────────────────────────────────────────────
// 求人 (recruitment_jobs) テーブルの型
// ─────────────────────────────────────────────
export interface RecruitmentJob {
  id: string;
  tenant_id: string;
  title: string;
  department?: string;
  employment_type?: string;
  description?: string;
  requirements?: string;
  salary_min?: number;
  salary_max?: number;
  location?: string;
  status: '下書き' | '公開' | '締切' | 'アーカイブ';
  ai_catchphrase?: string;
  ai_scout_text?: string;
  ai_interview_guide?: string;
  media_advice?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// ─────────────────────────────────────────────
// AI 生成結果の型
// ─────────────────────────────────────────────
export interface AiGenerationResult {
  /** AI生成キャッチコピー（全プラン利用可） */
  catchphrase: string;
  /** AI生成スカウト文（Pro以上） */
  scoutText?: string;
  /** AI生成面接ガイド（Pro以上） */
  interviewGuide?: string;
  /** AI生成メディアアドバイス */
  mediaAdvice?: string;
}

// ─────────────────────────────────────────────
// Pro機能のゲーティング判定ヘルパー
// ─────────────────────────────────────────────
export function isProFeatureAvailable(planType?: PlanType): boolean {
  return planType === 'pro' || planType === 'enterprise';
}
