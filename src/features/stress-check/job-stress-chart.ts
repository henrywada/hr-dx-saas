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
