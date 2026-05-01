// ストレスチェック 型定義（実際のDBスキーマ準拠）

/** 質問票タイプ: 57問 or 23問 */
export type QuestionnaireType = '57' | '23';

/** 実施期間のステータス */
export type PeriodStatus = 'draft' | 'active' | 'closed';

/** カテゴリ（領域）コード */
export type CategoryCode = 'A' | 'B' | 'C' | 'D';

/** カテゴリのラベルマッピング */
export const CATEGORY_LABELS: Record<CategoryCode, string> = {
  A: '仕事のストレス要因',
  B: '心身のストレス反応',
  C: '周囲のサポート',
  D: '満足度',
};

// --------------------------------------------------
// DB 由来の Interface
// --------------------------------------------------

/** 実施期間（stress_check_periods） */
export interface StressCheckPeriod {
  id: string;
  tenant_id: string;
  /** 拠点に紐づく場合のみ。NULL はテナント単位（旧データ） */
  division_establishment_id?: string | null;
  title: string;
  questionnaire_type: QuestionnaireType;
  status: PeriodStatus;
  start_date: string;
  end_date: string;
  fiscal_year: number;
  created_at: string;
  updated_at: string;
}

/** 質問（stress_check_questions） */
export interface StressCheckQuestion {
  id: string;
  questionnaire_type: QuestionnaireType;
  category: CategoryCode;
  question_no: number;
  question_text: string;
  scale_labels: string[] | null;
  score_weights: number[] | null;
  is_reverse: boolean;
  scale_name: string;
}

/** 選択肢（stress_check_response_options） */
export interface StressCheckResponseOption {
  id: string;
  scale_type: CategoryCode;
  score: number;
  label: string;
}

/** 回答レコード（stress_check_responses） */
export interface StressCheckResponse {
  id: string;
  tenant_id: string;
  period_id: string;
  employee_id: string;
  question_id: string;
  selected_score: number;
  submitted_at: string;
  created_at: string;
}

// --------------------------------------------------
// フロントエンド用の型
// --------------------------------------------------

/** 質問 + 該当する選択肢をまとめた表示用型 */
export interface QuestionWithOptions extends StressCheckQuestion {
  options: StressCheckResponseOption[];
}

/** カテゴリ（領域）ごとにグループ化した質問群 */
export interface CategoryGroup {
  category: CategoryCode;
  categoryLabel: string;
  questions: QuestionWithOptions[];
}

/** ユーザーの回答マップ (question_id → score) */
export type AnswerMap = Record<string, number>;
