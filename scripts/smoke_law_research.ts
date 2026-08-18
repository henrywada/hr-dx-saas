/**
 * 「調べる」機能の外部サイト疎通スモークテスト。
 * 実通信するため CI には入れない。手動で `npm run smoke:law-research` を実行する。
 * 外部サイトの HTML 構造変更を早期に検知するのが目的。
 */
import {
  laborGetLawArticle,
  laborGetMhlw,
  laborSearchJaish,
  laborSearchLaw,
  laborSearchMhlw,
} from '../src/features/law-research/lib/labor-law-client'
import {
  taxGetLawArticle,
  taxSearchSaiketsu,
} from '../src/features/law-research/lib/tax-law-client'
import { fetchLawRevisions } from '../src/features/law-research/lib/egov-revision'

async function check(label: string, run: () => Promise<{ ok: boolean }>) {
  const started = Date.now()
  const result = await run()
  const ms = Date.now() - started
  console.log(`${result.ok ? 'OK  ' : 'FAIL'} ${label} (${ms}ms)`)
  return result.ok
}

async function main() {
  const results = [
    await check('労基法36条', () => laborGetLawArticle('労働基準法', '36')),
    await check('法令検索（育児）', () => laborSearchLaw('育児')),
    await check('厚労省通達検索（36協定）', () => laborSearchMhlw('36協定')),
    await check('厚労省通達本文（00tb2035）', () => laborGetMhlw('00tb2035')),
    await check('安衛通達検索（ストレスチェック）', () => laborSearchJaish('ストレスチェック')),
    await check('法人税法22条', () => taxGetLawArticle('法人税法', '22')),
    await check('裁決事例検索（交際費）', () => taxSearchSaiketsu('交際費')),
    await check('改正履歴（労基法）', async () => {
      const hits = await fetchLawRevisions('322AC0000000049')
      return { ok: hits.length > 0 }
    }),
  ]

  const failed = results.filter(ok => !ok).length
  if (failed > 0) {
    console.error(`\n${failed} 件が失敗しました。出典サイトの構成変更を確認してください。`)
    process.exit(1)
  }
  console.log('\nすべて疎通しました。')
}

main()
