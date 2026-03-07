"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui';
import { ChevronDown, MessageSquareText, ClipboardList, Lightbulb } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function AiHistoryList({ logs }: { logs: any[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatValue = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) {
      return val.map(v => typeof v === 'object' && v !== null ? Object.entries(v).map(([key, value]) => `【${key}】 ${value}`).join('\n') : String(v)).join('\n\n');
    }
    if (typeof val === 'object' && val !== null) {
      return Object.entries(val).map(([key, value]) => `【${key}】 ${value}`).join('\n');
    }
    return String(val);
  };

  if (!logs || logs.length === 0) {
    return (
      <Card className="p-8 text-center bg-slate-50 border-dashed border-slate-200">
        <p className="text-slate-500 font-medium">過去の生成履歴はありません。</p>
        <p className="text-sm text-slate-400 mt-1">「AI求人メーカー」で新しく作成してみましょう。</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <Card key={log.id} className="overflow-hidden border border-slate-200 shadow-sm transition-all hover:border-slate-300">
          <button 
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left focus:outline-none"
            onClick={() => setOpenId(openId === log.id ? null : log.id)}
          >
            <div className="flex-1 pr-4">
              <div className="text-xs font-medium tracking-wide text-slate-400 mb-1.5 flex items-center gap-2">
                <span>{new Date(log.created_at).toLocaleString('ja-JP')}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                <span>作成者: {log.created_by ? '登録ユーザー' : '不明'}</span>
              </div>
              <h3 className="text-base font-bold text-slate-800 line-clamp-1">
                {formatValue(log.ai_catchphrase) || log.title || 'タイトル未設定'}
              </h3>
            </div>
            <div className={`p-2 rounded-full transition-colors ${openId === log.id ? 'bg-slate-100' : ''}`}>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${openId === log.id ? 'rotate-180' : ''}`} />
            </div>
          </button>
          
          {openId === log.id && (
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              
              {/* 入力内容 */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">📝 入力した課題・期待</p>
                <div className="text-sm text-slate-700 bg-white p-4 rounded-lg border border-slate-200 shadow-sm leading-relaxed">
                  <p><strong className="text-slate-800">解決したい課題：</strong> {log.description}</p>
                  <p className="mt-2"><strong className="text-slate-800">期待すること：</strong> {log.requirements}</p>
                </div>
              </div>

              {/* キャッチコピー */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">✨ AI キャッチコピー</p>
                <div className="text-lg font-bold text-slate-800 bg-white p-4 rounded-lg border border-slate-200 shadow-sm whitespace-pre-wrap">
                  {formatValue(log.ai_catchphrase) || 'なし'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* スカウト文 */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-blue-600 flex items-center gap-1.5 tracking-wider">
                    <MessageSquareText className="w-4 h-4" /> AI スカウト文
                  </p>
                  <div className="text-sm text-slate-700 bg-blue-50/50 p-4 rounded-lg border border-blue-100 whitespace-pre-wrap leading-relaxed shadow-sm">
                    {formatValue(log.ai_scout_text) || '生成されていません'}
                  </div>
                </div>

                {/* 面接ガイド */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-teal-600 flex items-center gap-1.5 tracking-wider">
                    <ClipboardList className="w-4 h-4" /> AI 面接ガイド
                  </p>
                  <div className="text-sm text-slate-700 bg-teal-50/50 p-4 rounded-lg border border-teal-100 whitespace-pre-wrap leading-relaxed shadow-sm">
                    {formatValue(log.ai_interview_guide) || '生成されていません'}
                  </div>
                </div>
              </div>

              {/* メディア・アドバイス */}
              <div className="space-y-2 mt-2">
                <p className="text-xs font-bold text-orange-600 flex items-center gap-1.5 tracking-wider uppercase">
                  <Lightbulb className="w-4 h-4" /> 💡 AIからの掲載メディア・アドバイス
                </p>
                <div className="text-sm text-slate-700 bg-orange-50/50 p-4 rounded-lg border border-orange-100 shadow-sm leading-relaxed whitespace-pre-wrap">
                  {log.media_advice ? formatValue(log.media_advice) : '※このデータが生成された時点では、メディア・アドバイス機能はまだ利用できませんでした。'}
                </div>
              </div>

            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
