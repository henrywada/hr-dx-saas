/** 件数バッジ表示（99件超は99+件と表示）。従来3箇所に重複していたロジックを統一 */
export function formatCount(count: number): string {
  return count > 99 ? '99+件' : `${count}件`
}
