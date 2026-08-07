import { NextRequest, NextResponse } from 'next/server'
import { ALL_STEPS, runGrantNotifierBatch } from '@/features/grant-notifier/batch/run'
import type { BatchStep } from '@/features/grant-notifier/types'

/**
 * GitHub Actions cron（毎週月曜 7:00 JST）から呼ばれる助成金情報配信バッチの実行エンドポイント。
 * x-cron-secret ヘッダーで認証し、collect → match → deliver を全テナント横断で実行する。
 *
 * body で {"steps":["collect"]} のようにステップを絞れる（障害時の部分再実行・動作確認用）。
 */

// 収集（J-グランツ全件）と全テナント分の AI 判定を行うため長時間化する
export const maxDuration = 300

function parseSteps(value: unknown): BatchStep[] {
  if (!Array.isArray(value)) return ALL_STEPS

  const steps = value.filter((v): v is BatchStep => ALL_STEPS.includes(v as BatchStep))
  return steps.length > 0 ? steps : ALL_STEPS
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.GRANT_NOTIFIER_CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'GRANT_NOTIFIER_CRON_SECRET 未設定' }, { status: 500 })
  }

  if (req.headers.get('x-cron-secret') !== cronSecret) {
    return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 })
  }

  // body なし（curl でヘッダーのみ送る cron）でも全ステップ実行できるようにする
  let steps: BatchStep[] = ALL_STEPS
  try {
    steps = parseSteps((await req.json())?.steps)
  } catch {
    // body が空・非 JSON の場合は既定の全ステップ
  }

  const summary = await runGrantNotifierBatch(steps)

  // 一部ステップが失敗したら 500 を返し、GitHub Actions 側でも失敗として検知できるようにする
  return NextResponse.json(summary, { status: summary.hasFailure ? 500 : 200 })
}
