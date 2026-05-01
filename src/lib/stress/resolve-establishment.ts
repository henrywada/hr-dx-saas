/**
 * 拠点（division_establishments）解決 — DB の resolve 関数と同一ロジック
 */

export type DivisionNode = { id: string; parent_id: string | null }

/** division_establishment_anchors の1行相当（フラット） */
export type EstablishmentAnchorLink = {
  division_establishment_id: string
  division_id: string
}

/** 所属から親を遡り、最初に一致した拠点アンカー（およびその division_id）を返す */
export function resolveEstablishmentAndAnchorForDivision(
  divisionId: string | null,
  _tenantId: string,
  anchorLinks: EstablishmentAnchorLink[],
  divisionsById: Map<string, DivisionNode>,
): { establishmentId: string | null; anchorDivisionId: string | null } {
  if (!divisionId) return { establishmentId: null, anchorDivisionId: null }
  let current: string | null = divisionId
  while (current) {
    const hit = anchorLinks.find((l) => l.division_id === current)
    if (hit) {
      return {
        establishmentId: hit.division_establishment_id,
        anchorDivisionId: hit.division_id,
      }
    }
    const row = divisionsById.get(current)
    current = row?.parent_id ?? null
  }
  return { establishmentId: null, anchorDivisionId: null }
}

export function resolveEstablishmentIdForDivision(
  divisionId: string | null,
  tenantId: string,
  anchorLinks: EstablishmentAnchorLink[],
  divisionsById: Map<string, DivisionNode>,
): string | null {
  return resolveEstablishmentAndAnchorForDivision(
    divisionId,
    tenantId,
    anchorLinks,
    divisionsById,
  ).establishmentId
}

export function buildEmployeeEstablishmentMap(
  employees: { id: string; division_id: string | null }[],
  tenantId: string,
  anchorLinks: EstablishmentAnchorLink[],
  divisions: DivisionNode[],
): Map<string, string | null> {
  const divisionsById = new Map(divisions.map((d) => [d.id, d]))
  const map = new Map<string, string | null>()
  for (const e of employees) {
    map.set(
      e.id,
      resolveEstablishmentIdForDivision(e.division_id, tenantId, anchorLinks, divisionsById),
    )
  }
  return map
}
