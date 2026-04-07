import React from 'react'
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  Bell,
  CheckCircle2,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { getServerUser } from '@/lib/auth/server-user'
import {
  getEmployeeImportantTask,
  getTopAnnouncements,
} from '@/features/dashboard/queries'
import QuickAccessCards from '../../(colored)/components/QuickAccess/QuickAccessCards.server'
import { HrInquiryNavLink } from '@/features/dashboard/components/HrInquiryNavLink'
import { InterviewBookingService } from '@/features/adm/high-stress-followup/components/InterviewBookingService'

export default async function DashboardPage() {
  const user = await getServerUser()

  const today = new Date()
  const formattedDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][today.getDay()]

  const [importantTask, announcements] = await Promise.all([
    getEmployeeImportantTask(user?.id ?? null),
    getTopAnnouncements(),
  ])

  const displayName = user?.name || 'ゲスト'

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
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

      {/* 2. Top Priority Task (To-Do) - 従業員専用のパルスサーベイ未回答タスク */}
      {importantTask && importantTask.isPending && (
        <div className="relative overflow-hidden bg-white rounded-2xl border-l-4 border-l-orange-500 border-y border-r border-slate-200 shadow-sm transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-backwards">
          <div className="absolute -top-10 -right-10 p-4 opacity-[0.03] pointer-events-none text-orange-900">
            <AlertCircle size={200} />
          </div>
          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                    <AlertCircle className="w-3.5 h-3.5 mr-1" />
                    重要タスク
                  </span>
                  <span className="text-sm font-semibold text-slate-500 flex items-center">
                    <Calendar className="w-4 h-4 mr-1.5 text-slate-400" />
                    {importantTask.deadlineLabel}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  【未回答】{importantTask.title}
                </h2>
                {importantTask.description && (
                  <p className="text-slate-600 text-sm max-w-2xl leading-relaxed bg-white/50">
                    {importantTask.description}
                  </p>
                )}
              </div>
              <div className="w-full sm:w-auto shrink-0 z-10">
                <Link
                  href={importantTask.linkPath}
                  className="flex items-center justify-center w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-sm shadow-orange-500/20 group h-14 px-8 rounded-xl text-base transition-colors"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2 opacity-90" />
                  今すぐ回答する
                  <ChevronRight className="w-5 h-5 ml-1 opacity-70 group-hover:translate-x-1.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Notices */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-backwards">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shadow-inner">
                <Bell className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-800">人事からのお知らせ</h3>
            </div>
            <button type="button" className="text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-semibold rounded-lg px-3 py-1.5 transition-colors">
              すべて見る
            </button>
          </div>
          <div className="p-0 flex-1">
            <ul className="divide-y divide-slate-100">
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
          <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex min-w-0 items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shadow-inner">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-800">クイックアクセス</h3>
            </div>
          </div>
          <div className="p-6 flex flex-col gap-3">
            <QuickAccessCards />
          </div>
        </div>
      </div>
    </div>
  );
}