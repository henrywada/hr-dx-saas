// 写真レポートの優先度定義（dx-sensorより移植）

export const PICTURE_PRIORITIES = ['high', 'medium', 'low'] as const

export type PicturePriority = (typeof PICTURE_PRIORITIES)[number]

export const DEFAULT_PICTURE_PRIORITY: PicturePriority = 'medium'

export const PICTURE_PRIORITY_LABELS: Record<PicturePriority, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

/**
 * 値がPicturePriorityの有効な値かどうかを判定する型ガード関数
 */
export function isPicturePriority(value: unknown): value is PicturePriority {
  return typeof value === 'string' && (PICTURE_PRIORITIES as readonly string[]).includes(value)
}

/**
 * PicturePriority値を日本語ラベルに変換する
 * 不正な値が渡された場合はデフォルト優先度のラベルを返す
 */
export function picturePriorityLabel(value: unknown): string {
  return isPicturePriority(value)
    ? PICTURE_PRIORITY_LABELS[value]
    : PICTURE_PRIORITY_LABELS[DEFAULT_PICTURE_PRIORITY]
}
