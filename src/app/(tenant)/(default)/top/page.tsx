import React from 'react'
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  Bell,
  CheckCircle2,
  ClipboardList,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { getServerUser } from '@/lib/auth/server-user'
import {
  getEmployeeImportantTask,
  getPendingAssignedQuestionnairesForTop,
  getTopAnnouncements,
} from '@/features/dashboard/queries'
import {
  getActivePeriod,
  checkStressCheckEligibility,
  checkExistingResponse,
} from '@/features/stress-check/queries'
import { PendingQuestionnaireNoticeCards } from '@/features/dashboard/components/PendingQuestionnaireNoticeCards'
import QuickAccessCards from '../../(colored)/components/QuickAccess/QuickAccessCards.server'
import { HrInquiryNavLink } from '@/features/dashboard/components/HrInquiryNavLink'
import { InterviewBookingService } from '@/features/adm/high-stress-followup/components/InterviewBookingService'
import { MobileNavSection } from '@/features/dashboard/components/MobileNavSection'

export default async function DashboardPage() {
  const user = await getServerUser()

  const today = new Date()
  const formattedDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][today.getDay()]

  const [importantTask, announcements, pendingQuestionnaires, activePeriod] = await Promise.all([
    getEmployeeImportantTask(user?.id ?? null, user?.tenant_id ?? null),
    getTopAnnouncements(),
    getPendingAssignedQuestionnairesForTop(user?.employee_id),
    getActivePeriod(),
  ])

  // ストレスチェック受検ボタン表示判定
  let showStressCheckTask = false
  let stressCheckAlreadyAnswered = false
  if (activePeriod && user?.id) {
    const [eligibility, alreadyAnswered] = await Promise.all([
      checkStressCheckEligibility(activePeriod.id, user.id),
      checkExistingResponse(activePeriod.id, user.id),
    ])
    showStressCheckTask = eligibility.eligible
    stressCheckAlreadyAnswered = alreadyAnswered
  }

  const displayName = user?.name || 'ゲスト'

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
          <InterviewBookingService />
          <HrInquiryNavLink />
        </div>
      </div>

      {/* 2. Top Priority Tasks - 2-Column Grid */}
      {(importantTask?.isPending || showStressCheckTask) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Important Task Card */}
          {importantTask && importantTask.isPending && (
            <div className="relative overflow-hidden bg-white rounded-2xl border-t-4 border-t-orange-500 border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-t-orange-600 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-backwards">
              <div className="p-6 flex flex-col justify-between h-full">
                <div className="space-y-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                    <AlertCircle className="w-3.5 h-3.5 mr-1" />
                    重要タスク
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {importantTask.title}
                    </h3>
                    {importantTask.description && (
                      <p className="text-slate-600 text-sm mt-2 line-clamp-2">
                        {importantTask.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="w-4 h-4" />
                    <span>{importantTask.deadlineLabel}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    href={importantTask.linkPath}
                    className="text-orange-500 hover:text-orange-600 font-semibold text-sm flex items-center gap-1 group"
                  >
                    今すぐ回答する
                    <ChevronRight className="w-4 h-4 opacity-60 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Stress Check Card */}
          {showStressCheckTask && (
            <div className="relative overflow-hidden bg-white rounded-2xl border-t-4 border-t-teal-500 border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-t-teal-600 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-backwards">
              <div className="p-6 flex flex-col justify-between h-full">
                <div className="space-y-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
                    <ClipboardList className="w-3.5 h-3.5 mr-1" />
                    ストレスチェック
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {stressCheckAlreadyAnswered
                        ? '✅ 回答済み'
                        : `${activePeriod?.title ?? 'ストレスチェック'}`}
                    </h3>
                    {activePeriod?.comment && !stressCheckAlreadyAnswered && (
                      <p className="text-slate-600 text-sm mt-2 line-clamp-2">
                        {activePeriod.comment}
                      </p>
                    )}
                  </div>
                  {activePeriod?.end_date && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {String(activePeriod.end_date).split('T')[0].replace(/-/g, '/')} まで
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <Link
                    href="/stress-check"
                    className={`font-semibold text-sm flex items-center gap-1 group ${
                      stressCheckAlreadyAnswered
                        ? 'text-slate-500 hover:text-slate-600'
                        : 'text-teal-600 hover:text-teal-700'
                    }`}
                  >
                    {stressCheckAlreadyAnswered ? '結果を確認する' : '今すぐ回答する'}
                    <ChevronRight className="w-4 h-4 opacity-60 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Notices */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-backwards">
          <div className="px-6 py-5 border-b border-[#ebebeb] flex items-center gap-3 bg-slate-50/50">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shadow-inner">
              <Bell className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-slate-800">人事からのお知らせ</h3>
          </div>
          <div className="p-0 flex-1">
            <PendingQuestionnaireNoticeCards pending={pendingQuestionnaires} />
            <ul
              className={`divide-y divide-[#ebebeb]${pendingQuestionnaires.length > 0 && announcements.length > 0 ? ' border-t border-[#ebebeb]' : ''}`}
            >
              {announcements.map(item => (
                <li key={item.id} className="group hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-start gap-4 p-5 sm:px-6 outline-none focus:bg-slate-50">
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-400 font-mono tracking-tight">
                          {item.dateLabel}
                        </span>
                        {item.targetAudience && (
                          <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            対象: {item.targetAudience}
                          </span>
                        )}
                        {item.isNew && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 leading-none">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors leading-relaxed">
                        🔔 {item.title}
                      </p>
                      {item.body && (
                        <p className="text-xs text-slate-600 line-clamp-4 leading-relaxed whitespace-pre-line">
                          {item.body}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 shrink-0 mt-2 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: Shortcuts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-backwards">
          <div className="px-6 py-5 border-b border-[#ebebeb] flex items-center gap-3 bg-slate-50/50">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shadow-inner">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-slate-800">クイックアクセス</h3>
          </div>
          <div className="p-6 flex-1">
            <div className="flex flex-col gap-3">
              <QuickAccessCards />
              <MobileNavSection />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
