import React from 'react'
import { AlertCircle, Calendar, ChevronRight, ClipboardList, Zap } from 'lucide-react'
import Link from 'next/link'
import { getServerUser } from '@/lib/auth/server-user'
import { getEmployeeImportantTask } from '@/features/dashboard/queries'
import {
  getActivePeriod,
  checkStressCheckEligibility,
  checkExistingResponse,
} from '@/features/stress-check/queries'
import { getTodayCheckin } from '@/features/condition-checkin/queries'
import { CheckinWidget } from '@/features/condition-checkin/components/CheckinWidget'
import { FeedPanel } from '@/features/dashboard/components/FeedPanel'
import { getTopFeedItems } from '@/features/dashboard/feed/queries'
import type { FeedProviderContext } from '@/features/dashboard/feed/provider'
import type { FeedItem } from '@/features/dashboard/feed/types'
import QuickAccessCards from '../../(tenant-admin)/components/QuickAccess/QuickAccessCards.server'
import { HrInquiryNavLink } from '@/features/dashboard/components/HrInquiryNavLink'
import { InterviewBookingService } from '@/features/adm/high-stress-followup/components/InterviewBookingService'
import { MobileNavSection } from '@/features/dashboard/components/MobileNavSection'
import {
  getVisibleDashboardElementKeys,
  isDashboardElementVisible,
} from '@/features/dashboard-ui-visibility/queries'

export default async function DashboardPage() {
  const user = await getServerUser()

  const today = new Date()
  const formattedDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][today.getDay()]

  const [importantTask, activePeriod, todayCheckin, visibleKeys] = await Promise.all([
    getEmployeeImportantTask(user?.id ?? null, user?.tenant_id ?? null),
    getActivePeriod(),
    user?.employee_id ? getTodayCheckin(user.employee_id) : Promise.resolve(null),
    getVisibleDashboardElementKeys(user?.tenant_id, 'top'),
  ])

  const v = (key: string) => isDashboardElementVisible(visibleKeys, key)

  // employee_id を持たない（人事DB未紐付けの）ユーザーでも、個人非依存のプロバイダ
  // （人事お知らせ等）は表示できるよう、employee_id 欠如だけではフィード全体を止めない
  const feedCtx: FeedProviderContext | null = user
    ? {
        employeeId: user.employee_id ?? '',
        userId: user.id,
        tenantId: user.tenant_id ?? '',
        divisionId: user.division_id ?? null,
        appRole: user.appRole,
        isManager: Boolean(user.is_manager),
      }
    : null

  // ストレスチェックカード表示判定（実施期間の日付 + 対象者判定のみ。回答有無は見ない）
  let showStressCheckTask = false
  let stressCheckAlreadyAnswered = false
  const [eligibilityResult, feedItems] = await Promise.all([
    activePeriod && user?.id && v('top.card.stress_check')
      ? Promise.all([
          checkStressCheckEligibility(activePeriod.id, user.id),
          checkExistingResponse(activePeriod.id, user.id),
        ])
      : Promise.resolve(null),
    feedCtx ? getTopFeedItems(feedCtx, visibleKeys) : Promise.resolve<FeedItem[]>([]),
  ])
  if (eligibilityResult) {
    const [eligibility, alreadyAnswered] = eligibilityResult
    showStressCheckTask = eligibility.eligible
    stressCheckAlreadyAnswered = alreadyAnswered
  }

  const displayName = user?.name || 'ゲスト'
  const showCondition = Boolean(user?.employee_id) && v('top.card.condition_checkin')
  const showImportantTask = Boolean(importantTask?.isPending) && v('top.card.important_task')
  const showTaskRow = showCondition || showImportantTask || showStressCheckTask
  const showFeed = v('top.section.feed')
  const showQuickAccess = v('top.section.quick_access')

  return (
    <div className="space-y-4 w-full px-4 sm:px-6 py-6 mx-auto max-w-[1200px]">
      {/* 1. Welcome Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 tracking-wide">
              {user?.appRoleName || '従業員'}
            </span>
            <span className="text-sm text-slate-500 font-medium">
              {formattedDate} ({dayOfWeek})
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            <span className="inline-block origin-bottom-right hover:rotate-12 transition-transform duration-300">
              😀
            </span>{' '}
            {displayName} さん、お疲れ様です！
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-500">
          {v('top.button.hr_inquiry') && <HrInquiryNavLink />}
        </div>
      </div>

      {/* 2. Top Priority Tasks */}
      {showTaskRow && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Condition Checkin Widget */}
          {showCondition && <CheckinWidget initialScore={todayCheckin?.score ?? null} />}

          {/* Important Task Card */}
          {showImportantTask && importantTask && (
            <div className="relative overflow-hidden bg-white rounded-lg border-t-4 border-t-orange-500 border border-slate-200 shadow-xs transition-all hover:shadow-sm hover:border-t-orange-600 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-backwards">
              <div className="p-5 flex flex-col justify-between h-full">
                <div className="space-y-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                    <AlertCircle className="w-3.5 h-3.5 mr-1" />
                    重要タスク
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {importantTask.title}
                    </h3>
                    {importantTask.description && (
                      <p className="text-slate-600 text-xs mt-2 line-clamp-2">
                        {importantTask.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{importantTask.deadlineLabel}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    href={importantTask.linkPath}
                    className="text-orange-500 hover:text-orange-600 font-semibold text-xs flex items-center gap-1 group"
                  >
                    今すぐ回答する
                    <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Stress Check Card */}
          {showStressCheckTask && (
            <div className="relative overflow-hidden bg-white rounded-lg border-t-4 border-t-teal-500 border border-slate-200 shadow-xs transition-all hover:shadow-sm hover:border-t-teal-600 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-backwards">
              <div className="p-5 flex flex-col justify-between h-full">
                <div className="space-y-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
                    <ClipboardList className="w-3.5 h-3.5 mr-1" />
                    ストレスチェック
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {stressCheckAlreadyAnswered
                        ? '✅ 回答済み'
                        : `${activePeriod?.title ?? 'ストレスチェック'}`}
                    </h3>
                    {activePeriod?.comment && !stressCheckAlreadyAnswered && (
                      <p className="text-slate-600 text-xs mt-2 line-clamp-2">
                        {activePeriod.comment}
                      </p>
                    )}
                  </div>
                  {activePeriod?.end_date && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {String(activePeriod.end_date).split('T')[0].replace(/-/g, '/')} まで
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <Link
                    href="/stress-check"
                    className={`font-semibold text-xs flex items-center gap-1 group ${
                      stressCheckAlreadyAnswered
                        ? 'text-slate-500 hover:text-slate-600'
                        : 'text-teal-600 hover:text-teal-700'
                    }`}
                  >
                    {stressCheckAlreadyAnswered ? '結果を確認する' : '今すぐ回答する'}
                    <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. 2-Column Layout */}
      {(showFeed || showQuickAccess) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Left: Notification Feed */}
          {showFeed && <FeedPanel items={feedItems} />}

          {/* Right: Shortcuts */}
          {showQuickAccess && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-backwards">
              <div className="px-5 py-2 border-b border-[#ebebeb] flex items-center gap-3 bg-slate-50/50">
                <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-md shadow-inner">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-800">クイックアクセス</h3>
              </div>
              <div className="px-5 pt-2 pb-5 flex-1">
                <div className="flex flex-col gap-3">
                  {v('top.quick_access.interview_booking') && <InterviewBookingService />}
                  <QuickAccessCards visibleKeys={visibleKeys} />
                  <MobileNavSection />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
