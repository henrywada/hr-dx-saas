import Link from 'next/link'
import { Clock } from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'
import { PLAN_CONFIG, type PlanType } from '../types'

interface PlanComingSoonProps {
  plan: PlanType
}

/**
 * 準備中プラン（PLAN_CONFIG.available === false）が指定された場合の案内画面。
 * ユーザーの意図と異なるプランで登録される事故を防ぐため、
 * 無料プランへサイレントにフォールバックせず明示的に案内する。
 */
export function PlanComingSoon({ plan }: PlanComingSoonProps) {
  const config = PLAN_CONFIG[plan]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-2xl flex items-center justify-center">
        <Clock className="w-8 h-8 text-gray-400" />
      </div>

      <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 mb-4">
        {config.label}
      </span>

      <h1 className="text-2xl font-bold text-gray-900 mb-3">現在準備中です</h1>
      <p className="text-sm text-gray-600 mb-8 leading-relaxed">
        {config.label}
        （従業員{config.maxEmployees}名以下）は現在準備中です。
        <br />
        無料プラン（従業員{PLAN_CONFIG.free.maxEmployees}名以下）は今すぐご利用いただけます。
      </p>

      <Link
        href={`${APP_ROUTES.AUTH.SIGNUP}?plan=free`}
        className="block w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
      >
        無料プランで登録する
      </Link>
    </div>
  )
}
