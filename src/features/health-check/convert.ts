/**
 * 他機関の検査値・判定を、そのテナントの標準機関基準へ変換する。
 * 標準機関の取込は恒等（raw = standard）。閾値再判定は標準機関では使わない。
 */
import type { ConvertContext, ConvertedItemValue, HealthCheckJudgmentCode } from './types'

export function resolveStandardJudgment(
  rawCode: string | null | undefined,
  ctx: ConvertContext
): { id: string | null; error?: string } {
  const raw = (rawCode ?? '').trim()
  if (!raw) return { id: null }

  if (ctx.isStandardInstitution) {
    const byCode = ctx.judgmentCodeByStandardCode.get(raw)
    if (byCode) return { id: byCode.id }
    return { id: null, error: `未知の標準判定コード: ${raw}` }
  }

  const mapped = ctx.judgmentCodeByRaw.get(raw)
  if (mapped) return { id: mapped.id }
  return { id: null, error: `判定コードを標準へ変換できません: ${raw}` }
}

function applyUnit(
  rawValue: string | null,
  rawUnit: string | null,
  itemId: string,
  ctx: ConvertContext
): { value: string | null; unit: string | null } {
  if (rawValue == null || rawValue === '') return { value: null, unit: rawUnit }
  if (ctx.isStandardInstitution) return { value: rawValue, unit: rawUnit }

  const key = `${itemId}::${(rawUnit ?? '').trim()}`
  const conv = ctx.unitMultiplierByItemAndFrom.get(key)
  if (!conv) return { value: rawValue, unit: rawUnit }

  const num = Number(String(rawValue).replace(/,/g, ''))
  if (!Number.isFinite(num)) return { value: rawValue, unit: rawUnit }
  const converted = num * conv.multiplier
  return { value: String(converted), unit: conv.toUnit }
}

function applyThreshold(
  standardValue: string | null,
  itemId: string,
  ctx: ConvertContext
): string | null {
  if (ctx.isStandardInstitution) return null
  if (standardValue == null || standardValue === '') return null
  const num = Number(String(standardValue).replace(/,/g, ''))
  if (!Number.isFinite(num)) return null

  const candidates = ctx.thresholdsByItemId.filter(t => t.item_id === itemId)
  const sexMatched = candidates.filter(t => t.sex == null || t.sex === ctx.employeeSex)
  for (const t of sexMatched) {
    const minOk = t.min_value == null || num >= t.min_value
    const maxOk = t.max_value == null || num <= t.max_value
    if (minOk && maxOk && t.judgment_id) return t.judgment_id
  }
  return null
}

export function convertItemValue(input: {
  itemId: string
  rawValue: string | null
  rawUnit: string | null
  institutionJudgmentRaw: string | null
  ctx: ConvertContext
}): ConvertedItemValue {
  const { itemId, rawValue, rawUnit, institutionJudgmentRaw, ctx } = input
  const unit = applyUnit(rawValue, rawUnit, itemId, ctx)
  const judged = resolveStandardJudgment(institutionJudgmentRaw, ctx)
  const thresholdId = applyThreshold(unit.value, itemId, ctx)

  return {
    itemId,
    rawValue,
    rawUnit,
    institutionJudgmentRaw,
    standardValue: unit.value,
    standardUnit: unit.unit,
    standardJudgmentId: thresholdId ?? judged.id,
    error: judged.error,
  }
}

export function convertOverallJudgment(
  raw: string | null,
  ctx: ConvertContext
): { id: string | null; error?: string } {
  return resolveStandardJudgment(raw, ctx)
}

export function indexJudgmentCodes(
  codes: HealthCheckJudgmentCode[]
): Map<string, HealthCheckJudgmentCode> {
  const map = new Map<string, HealthCheckJudgmentCode>()
  for (const c of codes) map.set(c.code, c)
  return map
}

/** 取込時に渡す変換コンテキストを、登録済みマスタから組み立てる */
export function buildConvertContext(input: {
  isStandardInstitution: boolean
  judgmentCodes: HealthCheckJudgmentCode[]
  codeMaps: { raw_code: string; standard_judgment_id: string }[]
  conversions: { item_id: string; from_unit: string; to_unit: string; multiplier: number }[]
  thresholds: {
    item_id: string
    sex: string | null
    min_value: number | null
    max_value: number | null
    judgment_id: string | null
  }[]
  employeeSex: 'male' | 'female' | null
}): ConvertContext {
  const byRaw = new Map<string, HealthCheckJudgmentCode>()
  for (const m of input.codeMaps) {
    const std = input.judgmentCodes.find(c => c.id === m.standard_judgment_id)
    if (std) byRaw.set(m.raw_code, std)
  }
  const unitMap = new Map<string, { toUnit: string; multiplier: number }>()
  for (const c of input.conversions) {
    unitMap.set(`${c.item_id}::${c.from_unit}`, {
      toUnit: c.to_unit,
      multiplier: Number(c.multiplier),
    })
  }
  return {
    isStandardInstitution: input.isStandardInstitution,
    judgmentCodeByRaw: byRaw,
    judgmentCodeByStandardCode: indexJudgmentCodes(input.judgmentCodes),
    unitMultiplierByItemAndFrom: unitMap,
    thresholdsByItemId: input.thresholds.map(t => ({
      item_id: t.item_id,
      sex: t.sex === 'male' || t.sex === 'female' ? t.sex : null,
      min_value: t.min_value == null ? null : Number(t.min_value),
      max_value: t.max_value == null ? null : Number(t.max_value),
      judgment_id: t.judgment_id,
    })),
    employeeSex: input.employeeSex,
  }
}
