/**
 * 仕事のストレス判定図（集団分析）の健康リスク計算
 *
 * 出典: 厚労省「ストレスチェック制度実施マニュアル」P86-87、docs/stress/仕事のストレス判定図.pdf
 *       （東京医科大学「職業性ストレス簡易調査票を用いたストレスの現状把握のためのマニュアル」より）
 *
 * - 入力は集団の 4 尺度の平均点（各 3 項目、3〜12 点）。各項目は
 *   そうだ=4 … ちがう=1、非常に=4 … 全くない=1 で数える（= 5 − 選択肢番号）。
 *   素点換算表の「得点」（rawScore）と同じ値になる。
 * - 判定図上の健康リスクは標準集団（全国平均）を 100 とした値。
 * - 総合健康リスク = (A) × (B) / 100
 * - 男女を分けない場合は男性の判定図を使う（マニュアル P86）。全国平均値は判定図資料の値。
 *   係数は判定図の等リスク線（100 の線が全国平均を通り、10 刻み）と一致することを確認済み。
 * - 同じ式は SQL 関数 public.stress_job_stress_health_risk にもある。変更時は両方を直すこと。
 */

export interface JobStressChartInput {
  /** 仕事の量的負担（心理的な仕事の負担（量）の得点） */
  workload: number
  /** 仕事のコントロール度の得点 */
  control: number
  /** 上司からのサポートの得点 */
  supervisor: number
  /** 同僚からのサポートの得点 */
  colleague: number
}

export interface JobStressHealthRisk {
  /** 量-コントロール判定図の健康リスク */
  riskA: number
  /** 職場の支援判定図の健康リスク */
  riskB: number
  /** 総合健康リスク */
  total: number
}

/** 判定図の全国平均（標準集団） */
export const JOB_STRESS_CHART_NORMS: JobStressChartInput = {
  workload: 8.7,
  control: 7.9,
  supervisor: 7.5,
  colleague: 8.1,
}

const COEF = {
  workload: 0.076,
  control: 0.089,
  supervisor: 0.097,
  colleague: 0.097,
} as const

/** 健康リスクがこの値を超えると、職場で何らかの問題が生じていることが多い（マニュアル P86） */
export const JOB_STRESS_HIGH_RISK_THRESHOLD = 120

/** 画面上で「要注意」として色分けする健康リスク（110 以上） */
export const JOB_STRESS_CAUTION_THRESHOLD = 110

export function calcJobStressHealthRisk(input: JobStressChartInput): JobStressHealthRisk {
  const n = JOB_STRESS_CHART_NORMS
  const riskA =
    100 *
    Math.exp(
      COEF.workload * (input.workload - n.workload) - COEF.control * (input.control - n.control)
    )
  const riskB =
    100 *
    Math.exp(
      -COEF.supervisor * (input.supervisor - n.supervisor) -
        COEF.colleague * (input.colleague - n.colleague)
    )
  return { riskA, riskB, total: (riskA * riskB) / 100 }
}

// ============================================================
// 判定図の描画用（軸範囲・等リスク線）
// ============================================================

export type JobStressChartKind = 'demandControl' | 'support'

export interface ChartPoint {
  x: number
  y: number
}

/**
 * 判定図の軸範囲（厚労省「仕事のストレス判定図」帳票と同じ）。
 * - 量-コントロール判定図: 横軸=仕事の量的負担、縦軸=仕事のコントロール
 * - 職場の支援判定図: 横軸=上司の支援、縦軸=同僚の支援
 */
export const JOB_STRESS_CHART_AXES: Record<
  JobStressChartKind,
  { x: readonly [number, number]; y: readonly [number, number] }
> = {
  demandControl: { x: [5, 12], y: [4, 11] },
  support: { x: [4, 10], y: [5, 11] },
}

/** 判定図に引く等リスク線の値（帳票と同じ 10 刻み） */
export const JOB_STRESS_ISO_RISKS = [70, 80, 90, 100, 110, 120, 130, 140, 150] as const

/** 等リスク線を y = slope·x + intercept の形で返す */
function isoRiskLine(kind: JobStressChartKind, risk: number): { slope: number; intercept: number } {
  const n = JOB_STRESS_CHART_NORMS
  const l = Math.log(risk / 100)
  if (kind === 'demandControl') {
    // l = a(x − 8.7) − b(y − 7.9)
    const slope = COEF.workload / COEF.control
    return { slope, intercept: n.control - slope * n.workload - l / COEF.control }
  }
  // l = −c(x − 7.5) − d(y − 8.1)
  const slope = -COEF.supervisor / COEF.colleague
  return { slope, intercept: n.colleague - slope * n.supervisor - l / COEF.colleague }
}

/**
 * 指定した健康リスクの等リスク線のうち、判定図の軸範囲に入る線分（端点 2 つ）を返す。
 * 軸範囲を通らない場合は null。
 */
export function isoRiskSegment(
  kind: JobStressChartKind,
  risk: number
): [ChartPoint, ChartPoint] | null {
  const { slope, intercept } = isoRiskLine(kind, risk)
  const { x: xr, y: yr } = JOB_STRESS_CHART_AXES[kind]
  const eps = 1e-9
  const inside = (p: ChartPoint) =>
    p.x >= xr[0] - eps && p.x <= xr[1] + eps && p.y >= yr[0] - eps && p.y <= yr[1] + eps

  const candidates: ChartPoint[] = [
    { x: xr[0], y: slope * xr[0] + intercept },
    { x: xr[1], y: slope * xr[1] + intercept },
    { x: (yr[0] - intercept) / slope, y: yr[0] },
    { x: (yr[1] - intercept) / slope, y: yr[1] },
  ].filter(inside)

  const unique = candidates.filter(
    (p, i) =>
      candidates.findIndex(q => Math.abs(q.x - p.x) < 1e-6 && Math.abs(q.y - p.y) < 1e-6) === i
  )
  if (unique.length < 2) return null
  const sorted = [...unique].sort((a, b) => a.x - b.x)
  return [sorted[0], sorted[sorted.length - 1]]
}

/** 判定図上の点の健康リスク（量-コントロール判定図なら (A)、職場の支援判定図なら (B)） */
export function chartRiskAt(kind: JobStressChartKind, p: ChartPoint): number {
  const n = JOB_STRESS_CHART_NORMS
  if (kind === 'demandControl') {
    return calcJobStressHealthRisk({ ...n, workload: p.x, control: p.y }).riskA
  }
  return calcJobStressHealthRisk({ ...n, supervisor: p.x, colleague: p.y }).riskB
}

/**
 * 判定図の軸範囲のうち、健康リスクが threshold 以上になる領域の多角形（頂点を周回順に）。
 * 帳票の「高リスク」の塗り分けに使う。領域が無ければ空配列。
 */
export function riskAtLeastPolygon(kind: JobStressChartKind, threshold: number): ChartPoint[] {
  const { x: xr, y: yr } = JOB_STRESS_CHART_AXES[kind]
  const box: ChartPoint[] = [
    { x: xr[0], y: yr[0] },
    { x: xr[1], y: yr[0] },
    { x: xr[1], y: yr[1] },
    { x: xr[0], y: yr[1] },
  ]
  // 等リスク線は直線なので、箱を半平面 1 枚で切り取る（Sutherland–Hodgman）
  const f = (p: ChartPoint) => Math.log(chartRiskAt(kind, p) / 100) - Math.log(threshold / 100)
  const out: ChartPoint[] = []
  for (let i = 0; i < box.length; i++) {
    const cur = box[i]
    const next = box[(i + 1) % box.length]
    const fc = f(cur)
    const fn = f(next)
    if (fc >= 0) out.push(cur)
    if (fc >= 0 !== fn >= 0) {
      const t = fc / (fc - fn)
      out.push({ x: cur.x + t * (next.x - cur.x), y: cur.y + t * (next.y - cur.y) })
    }
  }
  return out.length >= 3 ? out : []
}
