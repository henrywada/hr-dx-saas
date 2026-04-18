export type CreatorType = 'system' | 'tenant';
export type QuestionnaireStatus = 'draft' | 'active' | 'closed';
export type QuestionType = 'radio' | 'checkbox' | 'rating_table' | 'text';

export interface Questionnaire {
  id: string;
  creator_type: CreatorType;
  tenant_id: string | null;
  title: string;
  description: string | null;
  status: QuestionnaireStatus;
  created_by_employee_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionnaireSection {
  id: string;
  questionnaire_id: string;
  title: string;
  sort_order: number;
}

export interface QuestionnaireQuestion {
  id: string;
  questionnaire_id: string;
  section_id: string | null;
  question_type: QuestionType;
  question_text: string;
  scale_labels: string[] | null;
  is_required: boolean;
  sort_order: number;
}

export interface QuestionnaireQuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  sort_order: number;
}

export interface QuestionnaireQuestionItem {
  id: string;
  question_id: string;
  item_text: string;
  sort_order: number;
}

export interface QuestionnaireAssignment {
  id: string;
  questionnaire_id: string;
  tenant_id: string;
  employee_id: string;
  period_id: string | null;
  deadline_date: string | null;
  assigned_at: string;
}

export interface QuestionnaireResponse {
  id: string;
  questionnaire_id: string;
  assignment_id: string;
  employee_id: string;
  tenant_id: string;
  submitted_at: string | null;
}

export interface QuestionnaireAnswer {
  id: string;
  response_id: string;
  question_id: string;
  item_id: string | null;
  option_id: string | null;
  text_answer: string | null;
  score: number | null;
}

// 一覧表示用（設問数・回答率を含む）
export interface QuestionnaireListItem extends Questionnaire {
  question_count: number;
  assignment_count: number;
  submitted_count: number;
  /** 登録済み実施期間の件数（管理一覧の「実施期間数」） */
  period_count: number;
  /** PeriodListPanel と同基準で「実施中」表示となる期間が1件以上あるか */
  has_ongoing_period_display: boolean;
  /** has_ongoing が true のときの開始日（表示用） */
  ongoing_period_start_date: string | null;
  /** has_ongoing が true のときの終了日（表示用） */
  ongoing_period_end_date: string | null;
}

// 設問ビルダー用（選択肢・評価項目を含む）
export interface QuestionWithDetails extends QuestionnaireQuestion {
  options: QuestionnaireQuestionOption[];
  items: QuestionnaireQuestionItem[];
}

// 詳細取得用（セクション・設問・選択肢・評価項目を含む）
export interface QuestionnaireDetail extends Questionnaire {
  sections: QuestionnaireSection[];
  questions: QuestionWithDetails[];
}

// 回答画面用（アサイン情報を含む）
export interface AssignedQuestionnaire {
  assignment_id: string;
  questionnaire_id: string;
  title: string;
  description: string | null;
  deadline_date: string | null;
  assigned_at: string;
  submitted_at: string | null;
  creator_type: CreatorType;
  /** questionnaires.status（受付中=active） */
  questionnaire_status: QuestionnaireStatus;
  period_id: string | null;
  period_label: string | null;
  period_start_date: string | null;
  period_end_date: string | null;
  hr_message: string | null;
}

// 回答送信用
export interface AnswerInput {
  question_id: string;
  item_id?: string | null;
  option_id?: string | null;
  text_answer?: string | null;
  score?: number | null;
}

// 実施期間
export type PeriodType = 'weekly' | 'monthly' | 'date_range' | 'none';
export type PeriodStatus = 'active' | 'closed';

export interface QuestionnairePeriod {
  id: string;
  questionnaire_id: string;
  tenant_id: string;
  period_type: PeriodType;
  label: string | null;
  start_date: string | null;
  end_date: string | null;
  status: PeriodStatus;
  created_by_employee_id: string | null;
  created_at: string;
  hr_message: string | null;
}

// 期間一覧表示用（回答統計を含む）
export interface PeriodListItem extends QuestionnairePeriod {
  assignment_count: number;
  submitted_count: number;
}

// 期間別時系列集計（設問ごと）
export interface PeriodTrendPoint {
  period_id: string;
  label: string;
  start_date: string | null;
  avg_score: number | null;
  response_count: number;
}

// 実施期間作成入力
export interface CreatePeriodInput {
  questionnaire_id: string;
  period_type: PeriodType;
  label: string;
  start_date?: string | null;
  end_date?: string | null;
}

// アンケート作成フォーム入力
export interface CreateQuestionnaireInput {
  creator_type: CreatorType;
  title: string;
  description?: string;
  sections: CreateSectionInput[];
}

export interface CreateSectionInput {
  title: string;
  sort_order: number;
  questions: CreateQuestionInput[];
}

export interface CreateQuestionInput {
  question_type: QuestionType;
  question_text: string;
  scale_labels?: string[];
  is_required: boolean;
  sort_order: number;
  options?: { option_text: string; sort_order: number }[];
  items?: { item_text: string; sort_order: number }[];
}

/** 実施一覧（PeriodListPanel）と同一の表示区分 */
export type PeriodDisplayStatus = 'upcoming' | 'active' | 'closed' | 'interrupted';

/**
 * 期間行の「実施中 / 未開始 / 終了 / 中断」を判定する。
 * DB の status=closed は手動中断として「中断」扱い（日付より優先）。
 */
export function computePeriodDisplayStatus(period: {
  status: PeriodStatus;
  start_date: string | null;
  end_date: string | null;
}): PeriodDisplayStatus {
  if (period.status === 'closed') return 'interrupted';

  const today = new Date().toISOString().split('T')[0]!;

  if (period.start_date && period.end_date) {
    if (today < period.start_date) return 'upcoming';
    if (today > period.end_date) return 'closed';
    return 'active';
  }
  if (period.start_date && !period.end_date) {
    return today >= period.start_date ? 'active' : 'upcoming';
  }
  return 'active';
}
