const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60

/**
 * ログイン時刻〜最終操作時刻の秒数（推定滞在時間）。
 * 最終操作が無い・不正・ログイン前の場合は null。
 */
export function toStaySeconds(
  loggedInAt: string,
  lastActivityAt: string | null | undefined
): number | null {
  if (!lastActivityAt) return null
  const start = new Date(loggedInAt).getTime()
  const end = new Date(lastActivityAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null
  return Math.floor((end - start) / 1000)
}

/** 秒数を「32分」「1時間30分」形式にする（1分未満は「1分未満」） */
export function formatStayDuration(seconds: number | null): string {
  if (seconds === null) return '---'
  const totalMinutes = Math.floor(seconds / SECONDS_PER_MINUTE)
  if (totalMinutes < 1) return '1分未満'
  if (totalMinutes < MINUTES_PER_HOUR) return `${totalMinutes}分`
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR)
  return `${hours}時間${totalMinutes % MINUTES_PER_HOUR}分`
}
