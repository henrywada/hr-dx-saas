import type { ScoreFactors } from './types'

const FACTOR_DESCRIPTIONS: Array<{
  key: keyof Pick<
    ScoreFactors,
    'stress_score' | 'survey_score' | 'overtime_score' | 'absence_score' | 'growth_score'
  >
  label: string
}> = [
  { key: 'stress_score', label: 'ストレスチェックで高ストレス判定' },
  { key: 'survey_score', label: 'パルスサーベイのスコアが低下' },
  { key: 'overtime_score', label: '残業時間の増加' },
  { key: 'absence_score', label: 'アンケート未回答が続いている' },
  { key: 'growth_score', label: '1on1・評価未確定など成長機会の停滞' },
]

/** スコア寄与度が高い要因から順に、上位 limit 件の説明文を返す（0点の要因は除外） */
export function describeTopRiskFactors(factors: ScoreFactors, limit = 2): string[] {
  return FACTOR_DESCRIPTIONS.map(({ key, label }) => ({ score: factors[key], label }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ label }) => label)
}

function departmentLabel(departmentName: string | null): string {
  return departmentName ?? '未配属'
}

/** HTML本文へ埋め込む前に特殊文字をエスケープする（氏名・部署名は人事データ由来で無害化が必要） */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildManagerAlertEmail(params: {
  employeeName: string
  departmentName: string | null
  riskScore: number
  topFactors: string[]
  dashboardUrl: string
}): { subject: string; html: string } {
  const { employeeName, departmentName, riskScore, topFactors, dashboardUrl } = params
  const subject = `【要対応】${employeeName}さんの離職リスクが「高」に上昇しました`
  const factorsHtml =
    topFactors.length > 0
      ? `<ul>${topFactors.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>`
      : ''
  const html = `
    <p>${escapeHtml(employeeName)}さん（${escapeHtml(departmentLabel(departmentName))}）の離職リスクスコアが「高」（${riskScore}点）に上昇しました。</p>
    ${factorsHtml}
    <p>1on1等で状況を確認いただくことをおすすめします。</p>
    <p><a href="${dashboardUrl}">離職リスクダッシュボードで詳細を確認する</a></p>
  `.trim()
  return { subject, html }
}

export function buildHrDigestEmail(params: {
  transitions: Array<{ employeeName: string; departmentName: string | null; riskScore: number }>
  dashboardUrl: string
}): { subject: string; html: string } {
  const { transitions, dashboardUrl } = params
  const subject = `【離職リスクアラート】新たに${transitions.length}名が高リスクに該当しました`
  const rows = transitions
    .map(
      t =>
        `<tr><td>${escapeHtml(t.employeeName)}</td><td>${escapeHtml(departmentLabel(t.departmentName))}</td><td>${t.riskScore}</td></tr>`
    )
    .join('')
  const html = `
    <p>新たに離職リスク「高」に該当した従業員は以下の通りです。</p>
    <table><thead><tr><th>氏名</th><th>部署</th><th>スコア</th></tr></thead><tbody>${rows}</tbody></table>
    <p><a href="${dashboardUrl}">離職リスクダッシュボードで詳細を確認する</a></p>
  `.trim()
  return { subject, html }
}
