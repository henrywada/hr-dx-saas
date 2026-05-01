// ストレスチェック進捗管理ダッシュボード用の型定義

/** 部署別進捗統計 */
export interface DepartmentStat {
  id: string;
  parent_id: string | null;
  name: string;
  submitted: number;
  notSubmitted: number; // 未受検（提出記録なし）
  inProgress: number; // 否提出（consent_to_employer = false）
  rate: number; // 受検率（%）
  layer?: number | null;
  /** 子部署（ツリー表示用） */
  children?: DepartmentStat[];
}

/** 拠点別進捗統計 */
export interface EstablishmentProgressStat {
  id: string;
  name: string;
  submitted: number;
  notSubmitted: number;
  inProgress: number;
  rate: number;
}

/** 進捗統計データ */
export interface ProgressStats {
  /** 対象者数（テナント全従業員数） */
  totalEmployees: number;
  /** 受検完了者数 */
  submittedCount: number;
  /** 未受検者数 */
  notSubmittedCount: number;
  /** 結果提供同意者数 */
  consentCount: number;
  /** 受検率（%） */
  submissionRate: number;
  /** 結果提供同意率（%） */
  consentRate: number;
  /** 部署別統計 */
  departments: DepartmentStat[];
  /** 拠点別進捗（拠点マスタがある場合に利用） */
  establishments?: EstablishmentProgressStat[];
}

/** 未受検者（一覧表示用） */
export interface NotSubmittedEmployee {
  id: string;
  name: string | null;
  employee_no: string | null;
  job_title: string | null;
  division_id: string | null;
  division_name: string | null;
}

/** アクティブ実施期間の情報 */
export interface ActivePeriodInfo {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  fiscalYear: number;
  status: string;
}

// ============================================================
// 集団分析（組織健康度分析）ダッシュボード用
// ============================================================

/** 集団分析で使用する主要尺度のキー名 */
export const GROUP_ANALYSIS_SCALES = [
  { key: 'workloadQuantity', dbName: '心理的な仕事の負担（量）', label: '仕事の負担(量)', shortLabel: '負担(量)' },
  { key: 'workloadQuality', dbName: '心理的な仕事の負担（質）', label: '仕事の負担(質)', shortLabel: '負担(質)' },
  { key: 'control',         dbName: '仕事のコントロール度',       label: 'コントロール度', shortLabel: 'コントロール' },
  { key: 'supervisorSupport', dbName: '上司からのサポート',       label: '上司サポート', shortLabel: '上司' },
  { key: 'coworkerSupport', dbName: '同僚からのサポート',         label: '同僚サポート', shortLabel: '同僚' },
  { key: 'vitality',        dbName: '活気',                       label: '活気', shortLabel: '活気' },
] as const;

/** 尺度スコア（集団分析用） */
export interface ScaleAverages {
  workloadQuantity: number | null;
  workloadQuality: number | null;
  control: number | null;
  supervisorSupport: number | null;
  coworkerSupport: number | null;
  vitality: number | null;
}

/** 部署別集団分析データ */
export interface GroupAnalysisDepartment {
  departmentName: string;
  respondentCount: number;
  /** 10名未満の場合 true: マスキング対象 */
  isMasked: boolean;
  /** 主要尺度の平均評価点（1〜5段階） */
  scaleAverages: ScaleAverages;
  /** カテゴリ別平均素点 */
  avgScoreA: number | null;  // ストレス要因
  avgScoreB: number | null;  // 心身の反応
  avgScoreC: number | null;  // サポート
  avgScoreD: number | null;  // 満足度
  /** 高ストレス者数 */
  highStressCount: number;
  /** 高ストレス者率（%） */
  highStressRate: number;
  /** 総合健康リスク（全国平均=100基準） */
  totalHealthRisk: number | null;
}

/** 全社サマリーデータ */
export interface GroupAnalysisSummary {
  /** 分析対象者数（10名以上の部署のみ） */
  totalRespondents: number;
  /** 全社の高ストレス者率（%） */
  overallHighStressRate: number;
  /** 全社の総合健康リスク */
  overallHealthRisk: number | null;
  /** マスキング対象部署数 */
  maskedDepartmentCount: number;
  /** 全社平均尺度スコア */
  overallScaleAverages: ScaleAverages;
}
