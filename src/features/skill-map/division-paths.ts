/** 組織（divisions）の階層パス用ユーティリティ */

export type DivisionHierarchyNode = {
  id: string
  name: string | null
  parent_id: string | null
}

/**
 * root → 自分 の順で名称を並べ、`/` で連結したフルパスを返す。
 * parent ループまたは不正データでは打ち切る。
 */
export function buildDivisionPathLabel(
  divisionId: string,
  byId: Map<string, DivisionHierarchyNode>,
  maxDepth = 32
): string {
  const parts: string[] = []
  const seen = new Set<string>()
  let cur: DivisionHierarchyNode | undefined = byId.get(divisionId)
  while (cur && parts.length < maxDepth) {
    if (seen.has(cur.id)) break // 親子循環など
    seen.add(cur.id)
    parts.unshift((cur.name && cur.name.trim()) || '—')
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined
  }
  return parts.join('/')
}
