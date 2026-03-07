import React from 'react';
import { AlertCircle, Calendar, ChevronRight, Bell, User, BarChart2, MessageCircle, FileText, CheckCircle2, Zap } from 'lucide-react';
import { getServerUser } from '@/lib/auth/server-user';

export default async function DashboardPage() {
  const user = await getServerUser();


  const today = new Date('2026-02-27T12:49:42+09:00');
  const formattedDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][today.getDay()];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* 1. Welcome Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 tracking-wide">
              {user?.department || '営業部'}
            </span>
            <span className="text-sm text-slate-500 font-medium">
              {formattedDate} ({dayOfWeek})
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            <span className="inline-block origin-bottom-right hover:rotate-12 transition-transform duration-300">😀</span> {user?.name || 'ゲスト'} さん、お疲れ様です！
          </h1>
        </div>
      </div>

      {/* 2. Top Priority Task (To-Do) */}
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
                  2月28日まで
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                【未回答】今月の組織健康度アンケート
              </h2>
              <p className="text-slate-600 text-sm max-w-2xl leading-relaxed bg-white/50">
                毎月の組織コンディションを把握するための重要なアンケートです。回答時間は約3分です。期限内のご回答をお願いいたします。
              </p>
            </div>
            <div className="w-full sm:w-auto shrink-0 z-10">
              <button type="button" className="flex items-center justify-center w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-sm shadow-orange-500/20 group h-14 px-8 rounded-xl text-base transition-colors">
                <CheckCircle2 className="w-5 h-5 mr-2 opacity-90" />
                今すぐ回答する
                <ChevronRight className="w-5 h-5 ml-1 opacity-70 group-hover:translate-x-1.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

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
              {[
                { date: '2026.02.26', title: '健康診断の予約について（全社員対象）', isNew: true },
                { date: '2026.02.20', title: '年末調整の書類提出期限が迫っています', isNew: false },
                { date: '2026.02.15', title: 'オフィスの入館ルール一部変更のお知らせ', isNew: false },
                { date: '2026.02.01', title: '新しい社内ポータルの利用開始について', isNew: false },
              ].map((notice, i) => (
                <li key={i} className="group hover:bg-slate-50/80 transition-colors">
                  <a href="#" className="flex items-start gap-4 p-5 sm:px-6 outline-none focus:bg-slate-50">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400 font-mono tracking-tight">{notice.date}</span>
                        {notice.isNew && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 leading-none">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 leading-relaxed">
                        {notice.title}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 shrink-0 mt-2 transition-transform group-hover:translate-x-0.5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: Shortcuts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-backwards">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shadow-inner">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-slate-800">クイックアクセス</h3>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: User, label: '基本情報の確認', desc: 'プロフィールや住所など', color: 'bg-emerald-100 text-emerald-700', hoverColor: 'group-hover:text-emerald-600' },
              { icon: FileText, label: '給与明細の照会', desc: '今月・過去の明細', color: 'bg-cyan-100 text-cyan-700', hoverColor: 'group-hover:text-cyan-600' },
              { icon: BarChart2, label: '過去の回答履歴', desc: 'アンケート・評価など', color: 'bg-amber-100 text-amber-700', hoverColor: 'group-hover:text-amber-600' },
              { icon: MessageCircle, label: '人事へのお問合せ', desc: '各種申請・相談窓口', color: 'bg-rose-100 text-rose-700', hoverColor: 'group-hover:text-rose-600' },
            ].map((shortcut, i) => {
              const Icon = shortcut.icon;
              return (
                <button
                  key={i}
                  className="flex flex-col items-start p-5 bg-slate-50/50 hover:bg-white hover:shadow-md border shadow-sm border-slate-100 hover:border-indigo-100 rounded-xl transition-all duration-200 text-left group w-full outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <div className={`p-2.5 rounded-lg mb-4 ${shortcut.color} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`font-bold text-sm text-slate-800 mb-1.5 transition-colors ${shortcut.hoverColor}`}>
                    {shortcut.label}
                  </span>
                  <span className="text-xs font-medium text-slate-500 leading-relaxed">
                    {shortcut.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}