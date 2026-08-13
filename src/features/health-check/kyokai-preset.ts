/**
 * 協会けんぽ系 3 ファイル CSV のヘッダ → システム項目 code。
 * 未知ヘッダは取込時にテナント項目として追加する。
 */
import type { FileKind, HealthCheckItem, ItemKind } from './types'

/** 全角英数・記号を半角に寄せて比較する */
export function normalizeHeader(header: string): string {
  return header
    .replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ')
    .replace(/[‐‑‒–—―ー]/g, '-')
    .trim()
}

/** 結果本表・追加検査（sample1 / sample2）の標準項目名。手入力の表示名もこれを使う */
export const KYOKAI_STANDARD_ITEMS: { header: string; code: string }[] = [
  { header: '身長', code: 'height' },
  { header: '体重', code: 'weight' },
  { header: 'BMI', code: 'bmi' },
  { header: '腹囲', code: 'waist' },
  { header: '肥満度', code: 'obesity_rate' },
  { header: '体脂肪率', code: 'body_fat' },
  { header: '視力裸眼右', code: 'vision_naked_r' },
  { header: '視力裸眼左', code: 'vision_naked_l' },
  { header: '視力矯正右', code: 'vision_corrected_r' },
  { header: '視力矯正左', code: 'vision_corrected_l' },
  { header: '血圧1最高', code: 'sbp1' },
  { header: '血圧1最低', code: 'dbp1' },
  { header: '血圧2最高', code: 'sbp2' },
  { header: '血圧2最低', code: 'dbp2' },
  { header: '尿蛋白', code: 'urine_protein' },
  { header: '尿潜血', code: 'urine_occult_blood' },
  { header: '尿糖', code: 'urine_sugar' },
  { header: '尿ウロ', code: 'urine_urobilinogen' },
  { header: '聴力会話法', code: 'hearing_conversation' },
  { header: '聴力右1K', code: 'hearing_r_1k' },
  { header: '聴力左1K', code: 'hearing_l_1k' },
  { header: '聴力右4K', code: 'hearing_r_4k' },
  { header: '聴力左4K', code: 'hearing_l_4k' },
  { header: '胸部X線所見', code: 'chest_xray_finding' },
  { header: '心電図所見', code: 'ecg_finding' },
  { header: 'AST(GOT)', code: 'ast' },
  { header: 'ALT(GPT)', code: 'alt' },
  { header: 'γ-GT', code: 'ggt' },
  { header: 'ALP', code: 'alp' },
  { header: 'LDH', code: 'ldh' },
  { header: '総コレステロール', code: 'total_cholesterol' },
  { header: '中性脂肪', code: 'triglyceride' },
  { header: 'HDL-C', code: 'hdl_c' },
  { header: 'LDL-C', code: 'ldl_c' },
  { header: 'non-HDL-C', code: 'non_hdl_c' },
  { header: '尿素窒素', code: 'bun' },
  { header: 'クレアチニン', code: 'creatinine' },
  { header: 'eGFR', code: 'egfr' },
  { header: '血糖', code: 'glucose' },
  { header: 'HbA1c', code: 'hba1c' },
  { header: 'HbA1c(N)', code: 'hba1c_ngsp' },
  { header: '尿酸', code: 'uric_acid' },
  { header: 'CRP', code: 'crp' },
  { header: '白血球数', code: 'wbc' },
  { header: '赤血球数', code: 'rbc' },
  { header: '血色素量', code: 'hemoglobin' },
  { header: 'ヘマト', code: 'hematocrit' },
  { header: '血小板数', code: 'platelet' },
  { header: '体測分類判定', code: 'cat_body' },
  { header: '視力分類判定', code: 'cat_vision' },
  { header: '血圧分類判定', code: 'cat_bp' },
  { header: '聴力分類判定', code: 'cat_hearing' },
  { header: '胸部X線分類判定', code: 'cat_chest' },
  { header: '心電図分類判定', code: 'cat_ecg' },
  { header: '肝機能分類判定', code: 'cat_liver' },
  { header: '血中脂質分類判定', code: 'cat_lipid' },
  { header: '腎機能分類判定', code: 'cat_kidney' },
  { header: '糖代謝分類判定', code: 'cat_glucose' },
  { header: 'メタボ判定', code: 'metabolic' },
]

/** 未設定時の手入力。従来どおり法定数値の先頭12項目 */
export const DEFAULT_MANUAL_FORM_ITEM_CODES = [
  'height',
  'weight',
  'bmi',
  'waist',
  'vision_naked_r',
  'vision_naked_l',
  'vision_corrected_r',
  'vision_corrected_l',
  'sbp1',
  'dbp1',
  'sbp2',
  'dbp2',
] as const

const HEADER_TO_CODE: Record<string, string> = Object.fromEntries(
  KYOKAI_STANDARD_ITEMS.map(i => [i.header, i.code])
)

const CODE_TO_HEADER: Record<string, string> = Object.fromEntries(
  KYOKAI_STANDARD_ITEMS.map(i => [i.code, i.header])
)

/** 手入力・一覧の表示名。標準項目は CSV ヘッダ名で固定 */
export function displayItemName(code: string, fallbackName: string): string {
  return CODE_TO_HEADER[code] ?? fallbackName
}

/** 手入力フォームに出す項目。未保存なら既定12項目 */
export function resolveManualFormItems(
  allItems: HealthCheckItem[],
  selectedIds: string[]
): HealthCheckItem[] {
  const byId = new Map(allItems.map(i => [i.id, i]))
  if (selectedIds.length > 0) {
    return selectedIds.map(id => byId.get(id)).filter((i): i is HealthCheckItem => Boolean(i))
  }
  const systemByCode = new Map(allItems.filter(i => i.tenant_id == null).map(i => [i.code, i]))
  return DEFAULT_MANUAL_FORM_ITEM_CODES.map(code => systemByCode.get(code)).filter(
    (i): i is HealthCheckItem => Boolean(i)
  )
}

export function kyokaiHeaderToItemCode(header: string): string | null {
  const n = normalizeHeader(header)
  if (HEADER_TO_CODE[n]) return HEADER_TO_CODE[n]
  if (n.endsWith('判定')) {
    const base = n.slice(0, -2)
    if (HEADER_TO_CODE[base]) return HEADER_TO_CODE[base]
  }
  return null
}

export function inferItemKind(header: string, fileKind: FileKind): ItemKind {
  if (fileKind === 'questionnaire') return 'questionnaire'
  const n = normalizeHeader(header)
  if (n.includes('分類判定') || n === 'メタボ判定' || n.endsWith('分類判定')) {
    return 'category_judgment'
  }
  if (n.includes('所見')) return 'finding'
  return 'value'
}

/** 未知ヘッダ用の安定したテナント項目 code */
export function slugItemCode(header: string): string {
  const n = normalizeHeader(header).replace(/判定$/, '')
  const known = HEADER_TO_CODE[n]
  if (known) return known
  let hash = 0
  for (let i = 0; i < n.length; i++) {
    hash = (hash * 31 + n.charCodeAt(i)) | 0
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0')
  return `t_${hex}`
}
