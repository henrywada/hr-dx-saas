import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { executeRule, isDueTodayJst } from '@/features/auto-distribution/engine'
import type { AutoDistributionRule } from '@/features/auto-distribution/types'

/**
 * GitHub Actions cron（毎日 4:00 JST）から呼ばれる全テナント横断の配信実行エンドポイント。
 * x-cron-secret ヘッダーで認証し、createAdminClient() でRLSをバイパスして全ルールを走査する。
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.DISTRIBUTION_CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'DISTRIBUTION_CRON_SECRET 未設定' }, { status: 500 })
  }

  const providedSecret = req.headers.get('x-cron-secret')
  if (providedSecret !== cronSecret) {
    return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: activeRules, error } = await supabase
    .from('auto_distribution_rules')
    .select('*')
    .eq('is_active', true)

  if (error) {
    console.error('run-due fetch rules error:', error)
    return NextResponse.json({ error: 'ルール取得に失敗しました' }, { status: 500 })
  }

  const now = new Date()
  const dueRules = ((activeRules ?? []) as AutoDistributionRule[]).filter(rule =>
    isDueTodayJst(rule, now)
  )

  const results = await Promise.allSettled(
    dueRules.map(rule => executeRule(supabase, rule, 'cron'))
  )

  const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length
  const failed = results.length - succeeded

  return NextResponse.json({
    processed: dueRules.length,
    succeeded,
    failed,
  })
}
