'use client';

import { useState } from 'react';
import { Bell, Mail, Send } from 'lucide-react';

export function ReminderSettings() {
  const [template, setTemplate] = useState(
    '面接指導のご案内\n\nお疲れ様です。産業保健担当です。\nストレスチェックの結果に基づき、面接指導のご案内をいたします。\n\n日時: {{interview_date}}\n場所: {{interview_location}}\n\nご都合が悪い場合は、人事部までご連絡ください。'
  );
  const [timingBeforeDay, setTimingBeforeDay] = useState(true);
  const [timingMorning, setTimingMorning] = useState(true);
  const [timingAfterMeasure, setTimingAfterMeasure] = useState(true);
  const [recipientTarget, setRecipientTarget] = useState(true);
  const [recipientManager, setRecipientManager] = useState(false);
  const [recipientDoctor, setRecipientDoctor] = useState(false);
  const [recipientHr, setRecipientHr] = useState(true);

  const handleTestSend = () => {
    alert(
      'メール送信機能は別フェーズで実装予定です。\n（Resend / SendGrid 等の導入が必要）'
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl">
      <div className="flex items-center gap-2 text-slate-500 text-sm">
        <Bell className="w-4 h-4" />
        <span>リマインダー設定（UIのみ・メール送信は未実装）</span>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-800 mb-2">送信タイミング</h4>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={timingBeforeDay}
              onChange={(e) => setTimingBeforeDay(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="text-sm">面接前日に送信</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={timingMorning}
              onChange={(e) => setTimingMorning(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="text-sm">面接当日朝に送信</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={timingAfterMeasure}
              onChange={(e) => setTimingAfterMeasure(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="text-sm">就業措置決定後3日以内に送信</span>
          </label>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-800 mb-2">宛先</h4>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={recipientTarget}
              onChange={(e) => setRecipientTarget(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="text-sm">対象者</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={recipientManager}
              onChange={(e) => setRecipientManager(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="text-sm">上司</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={recipientDoctor}
              onChange={(e) => setRecipientDoctor(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="text-sm">産業医・保健師</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={recipientHr}
              onChange={(e) => setRecipientHr(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="text-sm">人事</span>
          </label>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
          <Mail className="w-4 h-4" />
          デフォルトテンプレート
        </h4>
        <p className="text-xs text-slate-500 mb-1">
          変数: {'{{interview_date}}'}, {'{{interview_location}}'}
        </p>
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={8}
          className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
        />
      </div>

      <div className="pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={handleTestSend}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <Send className="w-4 h-4" />
          テスト送信
        </button>
        <p className="text-xs text-slate-500 mt-2">
          ※ メール送信機能は Resend / SendGrid 等の導入後に実装予定です。
        </p>
      </div>
    </div>
  );
}
