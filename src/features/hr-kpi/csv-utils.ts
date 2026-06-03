// src/features/hr-kpi/csv-utils.ts
// クライアント側から安全にインポートできる純粋なCSVユーティリティ
import type { HrKpiBundle } from './types'

/** CSVエクスポート用：全KPIをフラットな行配列に変換する */
export function bundleToCsvRows(bundle: HrKpiBundle): string[][] {
  const fmt = (v: number | null, suffix = '') => (v != null ? `${v}${suffix}` : 'データなし')

  const tenure =
    bundle.retention.avgTenureMonths != null
      ? `${Math.floor(bundle.retention.avgTenureMonths / 12)}年${Math.round(bundle.retention.avgTenureMonths % 12)}ヶ月`
      : 'データなし'

  return [
    ['カテゴリ', 'KPI名', '値', '集計基準月'],
    ['採用', '今月の応募数', fmt(bundle.recruit.applicantsThisMonth, '件'), bundle.yearMonth],
    ['採用', '選考通過率', fmt(bundle.recruit.passThroughRate, '%'), bundle.yearMonth],
    ['採用', '充足率', fmt(bundle.recruit.fillRate, '%'), bundle.yearMonth],
    ['採用', '公開中求人数', fmt(bundle.recruit.openJobPostings, '件'), bundle.yearMonth],
    [
      '定着',
      '直近12ヶ月の退職者数',
      fmt(bundle.retention.turnoverCountLast12Months, '名'),
      bundle.yearMonth,
    ],
    ['定着', '在籍従業員数', fmt(bundle.retention.totalActiveEmployees, '名'), bundle.yearMonth],
    [
      '定着',
      '離職率（直近12ヶ月）',
      fmt(bundle.retention.turnoverRatePercent, '%'),
      bundle.yearMonth,
    ],
    ['定着', '平均在籍年数', tenure, bundle.yearMonth],
    [
      '生産性',
      '1人あたり平均残業時間（当月）',
      fmt(bundle.productivity.avgOvertimeHoursThisMonth, '時間'),
      bundle.yearMonth,
    ],
    [
      '生産性',
      '有休取得率',
      fmt(bundle.productivity.paidLeaveUtilizationPercent, '%'),
      bundle.yearMonth,
    ],
    [
      '生産性',
      '36協定特別条項対象者数',
      fmt(bundle.productivity.article36SubjectCount, '名'),
      bundle.yearMonth,
    ],
    [
      'エンゲージメント',
      'パルスサーベイ平均スコア',
      fmt(bundle.engagement.latestPulseSurveyScore, '/5.0'),
      bundle.yearMonth,
    ],
    [
      'エンゲージメント',
      'パルスサーベイ回答率',
      fmt(bundle.engagement.latestPulseResponseRate, '%'),
      bundle.yearMonth,
    ],
    [
      'エンゲージメント',
      '高ストレス率',
      fmt(bundle.engagement.highStressRatePercent, '%'),
      bundle.yearMonth,
    ],
    [
      '育成',
      'スキルギャップ率',
      fmt(bundle.development.skillGapRatePercent, '%'),
      bundle.yearMonth,
    ],
    [
      '育成',
      'eラーニング研修完了率',
      fmt(bundle.development.elCompletionRatePercent, '%'),
      bundle.yearMonth,
    ],
    [
      '育成',
      'eラーニング割り当て総数',
      fmt(bundle.development.activeElAssignments, '件'),
      bundle.yearMonth,
    ],
  ]
}
