/**
 * telework_pc_logs のイベント列からセッション区間の推定稼働秒を算出する。
 * heartbeat / activity / unlock を「アクティブ」として連続イベント間の経過を加算（ギャップ上限 600 秒）。
 * sleep_start, sleep_end, lock, logout で連鎖をリセット。
 */
export type PcLogRow = { event_time: string; event_type: string }

const ACTIVE = new Set(["heartbeat", "activity", "unlock"])
const RESET = new Set(["sleep_start", "sleep_end", "lock", "logout"])

export function computeWorkedSecondsFromLogs(
  logs: PcLogRow[],
  startMs: number,
  endMs: number,
): number {
  const sorted = [...logs].sort(
    (a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime(),
  )

  let total = 0
  let lastMs: number | null = null

  for (const row of sorted) {
    const t = new Date(row.event_time).getTime()
    if (Number.isNaN(t) || t < startMs || t > endMs) continue

    if (RESET.has(row.event_type)) {
      lastMs = null
      continue
    }
    if (!ACTIVE.has(row.event_type)) continue

    if (lastMs !== null) {
      const deltaSec = (t - lastMs) / 1000
      if (deltaSec > 0) {
        total += Math.min(deltaSec, 600)
      }
    }
    lastMs = t
  }

  return Math.round(total)
}

/** ログが無い・合計 0 のときは壁時計のセッション長を上限として返す */
export function resolveWorkedSeconds(
  logBased: number,
  startMs: number,
  endMs: number,
): number {
  const wall = Math.max(0, Math.round((endMs - startMs) / 1000))
  if (logBased > 0) return logBased
  return wall
}
