/**
 * 工数分布グラフ用の色定数。ブランドカラー（#FD7601）を先頭に、
 * 既存のRecharts利用箇所（DeptStackedBarChart等）と同様、CSS変数ではなく
 * feature専用のTypeScript定数として定義する。
 */
export const WORK_LOG_CHART_COLORS = [
  '#FD7601',
  '#0EA5E9',
  '#22C55E',
  '#A855F7',
  '#F43F5E',
  '#EAB308',
  '#14B8A6',
  '#6366F1',
]

export function getChartColor(index: number): string {
  return WORK_LOG_CHART_COLORS[index % WORK_LOG_CHART_COLORS.length]
}
