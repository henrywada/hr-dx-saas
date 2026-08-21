import { toJSTISOString, formatDateTimeInJST } from '@/lib/datetime'

/** 公開日時・掲載期限の入力値から、フォーム保存時点での公開状態を日本語で説明する */
export function publishStatusPreview(publishedAtLocal: string, expiresAtLocal: string): string {
  if (!publishedAtLocal) return ''

  const publishedAtISO = toJSTISOString(new Date(publishedAtLocal))
  const nowISO = toJSTISOString()
  const expiresAtISO = expiresAtLocal ? toJSTISOString(new Date(expiresAtLocal)) : null

  if (expiresAtISO && expiresAtISO <= publishedAtISO) {
    return '⚠ 掲載期限が公開日時より前になっています。見直してください。'
  }

  const publishedLabel = formatDateTimeInJST(publishedAtISO)
  const expiresLabel = expiresAtISO ? formatDateTimeInJST(expiresAtISO) : null

  if (publishedAtISO > nowISO) {
    return expiresLabel
      ? `${publishedLabel} に公開され、${expiresLabel} に掲載終了します。`
      : `${publishedLabel} に公開されます（それまでは表示されません）。`
  }
  return expiresLabel
    ? `現在公開中です。${expiresLabel} に掲載終了します。`
    : '現在公開中です（掲載期限なし）。'
}
