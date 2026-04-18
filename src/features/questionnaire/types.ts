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
