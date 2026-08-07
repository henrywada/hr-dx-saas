import type { CandidateGrant, TenantCondition } from '@/features/grant-notifier/types'

/**
 * 第1段: ルールベース絞込。
 * AI 判定のコストを下げるため、明らかに地域不適合な助成金を機械的に除外する。
 * 粗い絞込に留め、最終判定は AI（第2段）に委ねる。
 */

/** 全国対象を示す文字列 */
const NATIONWIDE = '全国'

/**
 * 助成金の対象地域がテナントの所在地と整合するか。
 *  - 条件に都道府県の指定が無ければ常に通す
 *  - 助成金が「全国」対象なら常に通す
 *  - それ以外は、対象地域文字列にテナントの都道府県名が含まれれば通す
 */
export function matchesRegion(grant: CandidateGrant, condition: TenantCondition): boolean {
  if (condition.prefectures.length === 0) return true

  const area = grant.targetArea ?? ''
  if (area.includes(NATIONWIDE)) return true

  return condition.prefectures.some(pref => pref !== '' && area.includes(pref))
}

/**
 * 第1段ルール絞込を通過するか。現状は地域整合のみ（最も誤検知が少なく安全な絞込）。
 * 業種・規模・キーワード等の細かな適合判断は AI（第2段）に委ねる
 * — 助成金は要件が暗黙的に書かれることが多く、機械的に落とすと取りこぼす。
 */
export function passesRuleFilter(grant: CandidateGrant, condition: TenantCondition): boolean {
  return matchesRegion(grant, condition)
}
