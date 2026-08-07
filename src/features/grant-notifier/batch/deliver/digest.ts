import type { DeliverableGrant } from '@/features/grant-notifier/types'

/**
 * 詳細ダイジェストメールの本文生成（純粋関数）。
 * 冒頭サマリ + 目次 + 1件ごとの詳細 + 固定フッタ（配信停止／免責／条件設定リンク）。
 * 件数上限を超えた分は Web アーカイブへのリンクに逃がす（Gmail の本文切り詰め対策）。
 */

/** 1通あたりの最大掲載件数。超過分はアーカイブへ誘導する */
export const MAX_ITEMS_PER_MAIL = 20

export interface DigestInput {
  grants: DeliverableGrant[]
  /** この受信者専用の配信停止URL */
  unsubscribeUrl: string
  /** 条件設定画面URL */
  conditionsUrl: string
  /** Webアーカイブ一覧URL（超過分の受け皿） */
  archiveUrl: string
  maxItems?: number
}

export interface Digest {
  subject: string
  html: string
  text: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** ISO8601 を JST の YYYY/MM/DD 表記にする。null／不正は「不明」 */
export function formatJstDate(iso: string | null): string {
  if (!iso) return '不明'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '不明'

  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''

  return `${get('year')}/${get('month')}/${get('day')}`
}

/** 金額を「〜570,000円」表記にする。null／0 は「記載なし」 */
export function formatAmount(amount: number | null): string {
  if (amount === null || amount <= 0) return '記載なし'
  return `〜${amount.toLocaleString('ja-JP')}円`
}

function grantTextBlock(grant: DeliverableGrant, index: number): string {
  const lines = [
    `${index}. ${grant.title}`,
    grant.reasons.length > 0 ? `   判定理由: ${grant.reasons.join(' / ')}` : null,
    grant.summary ? `   概要: ${grant.summary}` : null,
    `   対象地域: ${grant.targetArea ?? '不明'} / 従業員要件: ${grant.targetEmployees ?? '不明'}`,
    `   補助上限額: ${formatAmount(grant.maxAmount)} / 補助率: ${grant.subsidyRate ?? '記載なし'}`,
    `   申請締切: ${formatJstDate(grant.acceptanceEndAt)}`,
    `   出典: ${grant.issuer ?? '不明'}（情報取得日 ${formatJstDate(grant.fetchedAt)}）`,
    `   詳細・申請: ${grant.externalUrl}`,
  ]
  return lines.filter(line => line !== null).join('\n')
}

function grantHtmlBlock(grant: DeliverableGrant, index: number): string {
  const reasons =
    grant.reasons.length > 0
      ? `<p style="margin:4px 0;color:#555">判定理由: ${escapeHtml(grant.reasons.join(' / '))}</p>`
      : ''
  const summary = grant.summary ? `<p style="margin:4px 0">${escapeHtml(grant.summary)}</p>` : ''

  return `
    <section style="border-top:1px solid #e2e6ec;padding:12px 0">
      <h3 style="margin:0 0 6px">${index}. ${escapeHtml(grant.title)}</h3>
      ${reasons}
      ${summary}
      <ul style="margin:6px 0;padding-left:18px;color:#333">
        <li>対象地域: ${escapeHtml(grant.targetArea ?? '不明')} / 従業員要件: ${escapeHtml(grant.targetEmployees ?? '不明')}</li>
        <li>補助上限額: ${escapeHtml(formatAmount(grant.maxAmount))} / 補助率: ${escapeHtml(grant.subsidyRate ?? '記載なし')}</li>
        <li>申請締切: ${escapeHtml(formatJstDate(grant.acceptanceEndAt))}</li>
        <li>出典: ${escapeHtml(grant.issuer ?? '不明')}（情報取得日 ${escapeHtml(formatJstDate(grant.fetchedAt))}）</li>
      </ul>
      <p style="margin:6px 0"><a href="${escapeHtml(grant.externalUrl)}" target="_blank" rel="noopener noreferrer">詳細・申請はこちら（公式）</a></p>
    </section>`
}

/** 詳細ダイジェストを生成する。grants は配信対象（適合／要確認）のみを渡すこと */
export function buildDigest(input: DigestInput): Digest {
  const maxItems = input.maxItems ?? MAX_ITEMS_PER_MAIL
  const total = input.grants.length
  const shown = input.grants.slice(0, maxItems)
  const overflow = total - shown.length

  const subject = `【助成金情報】新着${total}件のお知らせ`

  const toc = shown.map((g, i) => `${i + 1}. ${g.title}`).join('\n')
  const overflowText =
    overflow > 0 ? `\n\n他 ${overflow} 件があります。Webでご確認ください: ${input.archiveUrl}` : ''
  const text = [
    `新着の助成金が ${total} 件あります。`,
    '',
    '【目次】',
    toc,
    '',
    '──────────',
    shown.map((g, i) => grantTextBlock(g, i + 1)).join('\n\n'),
    overflowText,
    '',
    '──────────',
    '※ 申請可否の最終確認は必ず公式情報でお願いします（本メールは情報提供であり申請可否を保証しません）。',
    `配信条件の変更: ${input.conditionsUrl}`,
    `配信停止: ${input.unsubscribeUrl}`,
  ].join('\n')

  const tocHtml = shown.map(g => `<li>${escapeHtml(g.title)}</li>`).join('')
  const overflowHtml =
    overflow > 0
      ? `<p>他 ${overflow} 件があります。<a href="${escapeHtml(input.archiveUrl)}" target="_blank" rel="noopener noreferrer">Webで確認する</a></p>`
      : ''
  const html = `
  <div style="font-family:'Noto Sans JP',sans-serif;max-width:680px;margin:0 auto;color:#111">
    <p>新着の助成金が <strong>${total}</strong> 件あります。</p>
    <ol style="color:#333">${tocHtml}</ol>
    ${shown.map((g, i) => grantHtmlBlock(g, i + 1)).join('')}
    ${overflowHtml}
    <hr style="margin:16px 0;border:none;border-top:1px solid #e2e6ec" />
    <p style="font-size:12px;color:#888">
      ※ 申請可否の最終確認は必ず公式情報でお願いします（本メールは情報提供であり申請可否を保証しません）。<br />
      <a href="${escapeHtml(input.conditionsUrl)}" target="_blank" rel="noopener noreferrer">配信条件の変更</a> ｜
      <a href="${escapeHtml(input.unsubscribeUrl)}" target="_blank" rel="noopener noreferrer">配信停止</a>
    </p>
  </div>`

  return { subject, html, text }
}
