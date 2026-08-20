import type { ResearchHit, ResearchResult } from '../types'

/**
 * 複数ソースの検索結果を1つの一覧にまとめる。
 * 一部ソースが失敗しても、成功分は返す（人事が資料にたどり着けることを優先する）。
 * 全部失敗したときだけ、最初のエラーを返す。
 */
export function mergeSearchResults(
  results: ResearchResult<ResearchHit[]>[]
): ResearchResult<ResearchHit[]> {
  const hits: ResearchHit[] = []
  const seen = new Set<string>()
  const errors: ResearchResult<ResearchHit[]>[] = []

  for (const result of results) {
    if (result.ok) {
      for (const hit of result.data) {
        if (seen.has(hit.id)) continue
        seen.add(hit.id)
        hits.push(hit)
      }
    } else {
      errors.push(result)
    }
  }

  if (hits.length > 0) return { ok: true, data: hits }
  if (errors.length === results.length && errors[0]) return errors[0]
  return { ok: true, data: [] }
}
