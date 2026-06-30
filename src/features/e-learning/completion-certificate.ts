/** 修了証 HTML を生成しブラウザ印刷ダイアログを開く */
export function printCompletionCertificate(input: {
  employeeName: string
  tenantName: string
  courseTitle: string
  completedAt: string
}): void {
  const completedLabel = new Date(input.completedAt).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tokyo',
  })
  const issuedLabel = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tokyo',
  })

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>修了証 — ${escapeHtml(input.courseTitle)}</title>
  <style>
    @page { size: A4 landscape; margin: 24mm; }
    body { font-family: "Noto Sans JP", "Hiragino Sans", sans-serif; color: #1e293b; margin: 0; }
    .cert { border: 3px solid #FD7601; padding: 48px 56px; min-height: 420px; box-sizing: border-box; }
    .brand { color: #FD7601; font-size: 14px; font-weight: 700; letter-spacing: 0.08em; }
    h1 { font-size: 36px; margin: 24px 0 8px; letter-spacing: 0.2em; }
    .name { font-size: 28px; font-weight: 700; margin: 32px 0 8px; border-bottom: 2px solid #e2e8f0; display: inline-block; padding-bottom: 4px; }
    .course { font-size: 20px; margin: 24px 0; }
    .meta { font-size: 14px; color: #64748b; margin-top: 48px; line-height: 1.8; }
    .footer { margin-top: 40px; font-size: 13px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="cert">
    <div class="brand">HR-DX eラーニング</div>
    <h1>修 了 証</h1>
    <p class="name">${escapeHtml(input.employeeName)} 様</p>
    <p class="course">「${escapeHtml(input.courseTitle)}」を修了したことを証します。</p>
    <div class="meta">
      <div>修了日: ${completedLabel}</div>
      <div>発行日: ${issuedLabel}</div>
      <div>発行元: ${escapeHtml(input.tenantName)}</div>
    </div>
    <div class="footer">本証書は HR-DX システムにより自動発行されました。</div>
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`

  // Blob URL 方式（about:blank + document.write はポップアップブロック環境で失敗しやすい）
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank', 'noopener,noreferrer,width=900,height=700')
  if (!win) {
    URL.revokeObjectURL(url)
    return
  }
  win.addEventListener('load', () => {
    URL.revokeObjectURL(url)
    win.print()
  })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
