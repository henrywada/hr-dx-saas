/** HTML本文へ埋め込む前に特殊文字をエスケープする（部署名は人事データ由来で無害化が必要） */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** データがある指標のみ整形して返す（turnover-risk/notification-mail.ts の describeTopRiskFactors 相当） */
export function formatEngagementFactorLines(params: {
  pulseScore: number | null
  highStressRate: number | null
  questionnaireResponseRate: number | null
}): string[] {
  const lines: string[] = []
  if (params.pulseScore !== null) {
    lines.push(`パルスサーベイ: ${params.pulseScore.toFixed(1)} / 5.0`)
  }
  if (params.highStressRate !== null) {
    lines.push(`高ストレス率: ${params.highStressRate}%`)
  }
  if (params.questionnaireResponseRate !== null) {
    lines.push(`アンケート回答率: ${params.questionnaireResponseRate}%`)
  }
  return lines
}

export function buildManagerAlertEmail(params: {
  divisionName: string
  compositeScore: number
  factorLines: string[]
  dashboardUrl: string
}): { subject: string; html: string } {
  const { divisionName, compositeScore, factorLines, dashboardUrl } = params
  const subject = `【要確認】${divisionName}のエンゲージメントスコアが低下しています`
  const factorsHtml =
    factorLines.length > 0
      ? `<ul>${factorLines.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>`
      : ''
  const html = `
    <p>${escapeHtml(divisionName)}の総合エンゲージメントスコアが「アラート」（${compositeScore}点）になりました。</p>
    ${factorsHtml}
    <p>パルスサーベイ結果の確認や1on1の実施をおすすめします。</p>
    <p><a href="${dashboardUrl}">エンゲージメントダッシュボードで詳細を確認する</a></p>
  `.trim()
  return { subject, html }
}

export function buildHrDigestEmail(params: {
  transitions: Array<{ divisionName: string; compositeScore: number }>
  dashboardUrl: string
}): { subject: string; html: string } {
  const { transitions, dashboardUrl } = params
  const subject = `【エンゲージメントアラート】新たに${transitions.length}部署が要注意状態になりました`
  const rows = transitions
    .map(t => `<tr><td>${escapeHtml(t.divisionName)}</td><td>${t.compositeScore}</td></tr>`)
    .join('')
  const html = `
    <p>新たにエンゲージメント「アラート」状態に該当した部署は以下の通りです。</p>
    <table><thead><tr><th>部署名</th><th>スコア</th></tr></thead><tbody>${rows}</tbody></table>
    <p><a href="${dashboardUrl}">エンゲージメントダッシュボードで詳細を確認する</a></p>
  `.trim()
  return { subject, html }
}
