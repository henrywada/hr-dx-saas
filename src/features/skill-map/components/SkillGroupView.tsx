'use client'

import { useMemo, useState } from 'react'
import type {
  SkillGroupRow,
  SkillLevel,
  SkillRequirement,
  TenantSkillWithRequirements,
} from '../types'
import { CSVDownloadButton } from '@/components/ui/CSVDownloadButton'

type Props = {
  groups: SkillGroupRow[]
  skillsWithRequirements: TenantSkillWithRequirements[]
  levels: SkillLevel[]
  /** 従業員ID → 有効な技能要件ID（employee_skill_requirement_selections と対応） */
  requirementSelectionsByEmployee: Record<string, string[]>
}

const SELECT_CLASS =
  'min-w-[10rem] max-w-xl rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 enabled:cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 sm:min-w-48'

/** プレースホルダ（未選択 = 空欄） */
const EMPTY_VALUE = ''

/** ドロップダウンと一致する要件行だけテーブルに出す（未指定なら職種マスタの全要件） */
function reqsForTableRows(
  reqs: SkillRequirement[],
  filterReqName: string,
  filterLevelId: string
): SkillRequirement[] {
  if (!filterReqName && !filterLevelId) return reqs
  return reqs.filter(r => {
    if (filterReqName && r.name !== filterReqName) return false
    if (filterLevelId && r.level_id !== filterLevelId) return false
    return true
  })
}

/** 職種マスタ上の要件がドロップダウン条件に合致するか（職種カードの表示可否） */
function skillMatchesRequirementFilters(
  reqs: TenantSkillWithRequirements['requirements'],
  reqName: string,
  levelId: string
): boolean {
  if (!reqName && !levelId) return true
  if (reqName && levelId) {
    return reqs.some(r => r.name === reqName && r.level_id === levelId)
  }
  if (reqName) return reqs.some(r => r.name === reqName)
  if (levelId) return reqs.some(r => r.level_id === levelId)
  return true
}

/** レベル列：スキル編集で On の要件は ■、それ以外は □ */
function levelLabelWithOnOff(
  levelName: string,
  requirementId: string | null,
  employeeId: string | null,
  byEmployee: Map<string, Set<string>>
): string {
  if (!requirementId || !employeeId) return levelName
  const selected = byEmployee.get(employeeId)?.has(requirementId) ?? false
  return `${levelName}(${selected ? '■' : '□'})`
}

/** 同一スキル（要件名）に属する全レベルを「 / 」で連結 */
function joinedLevelsForSkill(
  reqs: SkillRequirement[],
  employeeId: string | null,
  byEmployee: Map<string, Set<string>>
): string {
  const sorted = [...reqs].sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
  return sorted
    .map(r => {
      const raw = (r.level?.name && r.level.name.trim()) || (r.criteria && r.criteria.trim()) || '—'
      return levelLabelWithOnOff(raw, r.id, employeeId, byEmployee)
    })
    .join(' / ')
}

/** フィルタ後要件を要件名（スキル列）でグループ化 */
function groupReqsBySkillName(reqs: SkillRequirement[]): Map<string, SkillRequirement[]> {
  const m = new Map<string, SkillRequirement[]>()
  for (const r of reqs) {
    const list = m.get(r.name) ?? []
    list.push(r)
    m.set(r.name, list)
  }
  return m
}

export function SkillGroupView({
  groups,
  skillsWithRequirements,
  levels,
  requirementSelectionsByEmployee,
}: Props) {
  const [filterSkillId, setFilterSkillId] = useState(EMPTY_VALUE)
  const [filterReqName, setFilterReqName] = useState(EMPTY_VALUE)
  const [filterLevelId, setFilterLevelId] = useState(EMPTY_VALUE)

  const metaBySkillId = useMemo(() => {
    const m = new Map<string, TenantSkillWithRequirements>()
    for (const s of skillsWithRequirements) {
      m.set(s.id, s)
    }
    return m
  }, [skillsWithRequirements])

  const selectionsMap = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const [eid, ids] of Object.entries(requirementSelectionsByEmployee)) {
      m.set(eid, new Set(ids))
    }
    return m
  }, [requirementSelectionsByEmployee])

  /** スキル名: 職種選択後のみ、その職種の要件名一覧 */
  const requirementNameOptions = useMemo(() => {
    if (!filterSkillId) return []
    const meta = metaBySkillId.get(filterSkillId)
    const names = new Set<string>()
    for (const r of meta?.requirements ?? []) names.add(r.name)
    return [...names].sort((a, b) => a.localeCompare(b, 'ja'))
  }, [filterSkillId, metaBySkillId])

  /** レベル: 職種＋スキル（要件名）選択後、その組み合わせに現れるレベルのみ */
  const levelOptionsForChain = useMemo(() => {
    if (!filterSkillId || !filterReqName) return []
    const meta = metaBySkillId.get(filterSkillId)
    const levelIds = new Set<string>()
    for (const r of meta?.requirements ?? []) {
      if (r.name === filterReqName && r.level_id) levelIds.add(r.level_id)
    }
    return levels
      .filter(l => levelIds.has(l.id))
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ja'))
  }, [filterSkillId, filterReqName, metaBySkillId, levels])

  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      if (!filterSkillId) return true
      if (g.skill.id !== filterSkillId) return false
      const meta = metaBySkillId.get(g.skill.id)
      const reqs = meta?.requirements ?? []
      if (!filterReqName && !filterLevelId) return true
      return skillMatchesRequirementFilters(reqs, filterReqName, filterLevelId)
    })
  }, [groups, filterSkillId, filterReqName, filterLevelId, metaBySkillId])

  /** 職種 × 担当者 × スキル（要件名）= 1行。レベル列は当該スキルの全レベルを連結 */
  const tableRows = useMemo(() => {
    const out: Array<{
      key: string
      divisionLabel: string
      employeeNo: string
      fullName: string
      jobTitle: string
      skillName: string
      levelDisplay: string
    }> = []

    for (const g of filteredGroups) {
      const meta = metaBySkillId.get(g.skill.id)
      const allReqs = meta?.requirements ?? []
      const reqs = reqsForTableRows(allReqs, filterReqName, filterLevelId)

      if (g.employees.length === 0) {
        if (reqs.length === 0) {
          out.push({
            key: `${g.skill.id}-empty-noreq`,
            divisionLabel: '—',
            employeeNo: '—',
            fullName: '（担当者なし）',
            jobTitle: g.skill.name,
            skillName: '—',
            levelDisplay: '—',
          })
        } else {
          const byName = groupReqsBySkillName(reqs)
          const skillNames = [...byName.keys()].sort((a, b) => a.localeCompare(b, 'ja'))
          for (const skillName of skillNames) {
            const groupReqs = byName.get(skillName)!
            out.push({
              key: `${g.skill.id}-empty-skill-${skillName}`,
              divisionLabel: '—',
              employeeNo: '—',
              fullName: '（担当者なし）',
              jobTitle: g.skill.name,
              skillName,
              levelDisplay: joinedLevelsForSkill(groupReqs, null, selectionsMap),
            })
          }
        }
        continue
      }

      for (const emp of g.employees) {
        const no = emp.employee_no?.trim() ? emp.employee_no.trim() : '—'
        const name = emp.full_name?.trim() ? emp.full_name.trim() : '—'
        const div = emp.division_name?.trim() ? emp.division_name.trim() : '—'

        if (reqs.length === 0) {
          out.push({
            key: `${emp.employee_id}-${g.skill.id}-noreq`,
            divisionLabel: div,
            employeeNo: no,
            fullName: name,
            jobTitle: g.skill.name,
            skillName: '—',
            levelDisplay: '—',
          })
        } else {
          const byName = groupReqsBySkillName(reqs)
          const skillNames = [...byName.keys()].sort((a, b) => a.localeCompare(b, 'ja'))
          for (const skillName of skillNames) {
            const groupReqs = byName.get(skillName)!
            out.push({
              key: `${emp.employee_id}-${g.skill.id}-skill-${skillName}`,
              divisionLabel: div,
              employeeNo: no,
              fullName: name,
              jobTitle: g.skill.name,
              skillName,
              levelDisplay: joinedLevelsForSkill(groupReqs, emp.employee_id, selectionsMap),
            })
          }
        }
      }
    }
    return out
  }, [filteredGroups, metaBySkillId, filterReqName, filterLevelId, selectionsMap])

  // CSV データ生成（フィルター後の tableRows をそのまま利用）
  const csvData = useMemo((): string[][] => {
    const header = ['部署', '従業員番号', '氏名', '職種', 'スキル', 'レベル']
    const dataRows = tableRows.map(row => [
      row.divisionLabel,
      row.employeeNo,
      row.fullName,
      row.jobTitle,
      row.skillName,
      row.levelDisplay,
    ])
    return [header, ...dataRows]
  }, [tableRows])

  if (groups.length === 0) {
    return <p className="py-12 text-center text-gray-400">技能が登録されていません</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
          <label
            htmlFor="skill-map-filter-job"
            className="shrink-0 text-sm font-medium text-gray-800"
          >
            職種：
          </label>
          <select
            id="skill-map-filter-job"
            value={filterSkillId}
            onChange={e => {
              setFilterSkillId(e.target.value)
              setFilterReqName(EMPTY_VALUE)
              setFilterLevelId(EMPTY_VALUE)
            }}
            className={SELECT_CLASS}
            aria-label="職種で絞り込み"
          >
            <option value="">{EMPTY_VALUE}</option>
            {skillsWithRequirements.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
          <label
            htmlFor="skill-map-filter-req"
            className="shrink-0 text-sm font-medium text-gray-800"
          >
            スキル：
          </label>
          <select
            id="skill-map-filter-req"
            value={filterReqName}
            disabled={!filterSkillId}
            onChange={e => {
              setFilterReqName(e.target.value)
              setFilterLevelId(EMPTY_VALUE)
            }}
            className={SELECT_CLASS}
            aria-label="スキル（要件名）で絞り込み"
          >
            <option value="">{EMPTY_VALUE}</option>
            {requirementNameOptions.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
          <label
            htmlFor="skill-map-filter-level"
            className="shrink-0 text-sm font-medium text-gray-800"
          >
            レベル：
          </label>
          <select
            id="skill-map-filter-level"
            value={filterLevelId}
            disabled={!filterSkillId || !filterReqName}
            onChange={e => setFilterLevelId(e.target.value)}
            className={SELECT_CLASS}
            aria-label="レベルで絞り込み"
          >
            <option value="">{EMPTY_VALUE}</option>
            {levelOptionsForChain.map(lv => (
              <option key={lv.id} value={lv.id}>
                {lv.name}
              </option>
            ))}
          </select>
        </div>

        <CSVDownloadButton data={csvData} filename="skill-map-roles.csv" label="CSVダウンロード" />
      </div>

      {filteredGroups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-10 text-center text-sm text-gray-500">
          条件に一致する職種がありません
        </p>
      ) : tableRows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-10 text-center text-sm text-gray-500">
          表示する行がありません
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                    部署
                  </th>
                  <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                    従業員番号
                  </th>
                  <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                    氏名
                  </th>
                  <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                    現在の職種
                  </th>
                  <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                    スキル
                  </th>
                  <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                    レベル
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, index) => (
                  <tr
                    key={row.key}
                    className={`border-b border-gray-100 transition-[background-color,box-shadow] duration-300 ease-out hover:bg-gray-100 hover:shadow-[0_6px_22px_-4px_rgba(15,23,42,0.22)] ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="max-w-xs px-4 py-3 text-gray-700 wrap-break-word whitespace-normal md:max-w-md">
                      {row.divisionLabel}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-gray-900">
                      {row.employeeNo}
                    </td>
                    <td className="max-w-48 px-4 py-3 text-gray-900">{row.fullName}</td>
                    <td className="px-4 py-3 text-gray-900">{row.jobTitle}</td>
                    <td className="px-4 py-3 text-gray-900">{row.skillName}</td>
                    <td className="max-w-md px-4 py-3 whitespace-normal wrap-break-word text-gray-900">
                      {row.levelDisplay}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
