import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

/**
 * SerpAPI 残量警告メールを送信する（ベストエフォート）。
 * SMTP 未設定・送信失敗時は例外を投げず false を返す
 * （週次ジョブ本体を止めないため。呼び出し側で console.error する）。
 */
export async function sendQuotaWarningEmail(
  toEmail: string,
  searchesLeft: number
): Promise<boolean> {
  const host = Deno.env.get('SMTP_HOST')
  const port = Number(Deno.env.get('SMTP_PORT') ?? '587')
  const user = Deno.env.get('SMTP_USER')
  const pass = Deno.env.get('SMTP_PASS')

  if (!host) {
    console.error('[hr-law-refresh] SMTP_HOST 未設定のため警告メールをスキップしました')
    return false
  }

  const client = new SMTPClient({
    connection: {
      hostname: host,
      port,
      auth: user && pass ? { username: user, password: pass } : undefined,
      tls: port === 465,
    },
  })

  try {
    await client.send({
      from: user || 'noreply@hr-dx.jp',
      to: toEmail,
      subject: '【HR-DX】SerpAPI 残量が少なくなっています',
      content:
        `SerpAPI の残クエリ数が ${searchesLeft} 件になりました。\n` +
        '法令ナレッジ自動更新（hr-law-refresh）が正常に動作しなくなるおそれがあります。\n' +
        'SerpAPI の管理画面（https://serpapi.com/manage-api-key）でプランを確認してください。',
    })
    return true
  } catch (e) {
    console.error('[hr-law-refresh] 警告メール送信に失敗しました', e)
    return false
  } finally {
    await client.close()
  }
}
