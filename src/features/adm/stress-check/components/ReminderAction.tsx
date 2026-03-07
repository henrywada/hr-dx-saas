'use client';

import { Bell } from 'lucide-react';
import { useState } from 'react';

export default function ReminderAction() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    // ダミー処理：後日実装予定
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1200);
  };

  return (
    <div className="flex items-center justify-between bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-200 rounded-2xl p-5">
      <div className="flex items-center gap-4">
        <div className="bg-amber-100 p-3 rounded-xl">
          <Bell className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800">リマインド通知</p>
          <p className="text-xs text-gray-500 mt-0.5">
            未受検の従業員に対してリマインドメールを送信します
          </p>
        </div>
      </div>

      <button
        onClick={handleClick}
        disabled={loading || sent}
        className={`
          inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
          transition-all duration-300 shadow-sm
          ${sent
            ? 'bg-emerald-100 text-emerald-700 cursor-default'
            : loading
              ? 'bg-gray-100 text-gray-400 cursor-wait'
              : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 hover:shadow-md active:scale-95'
          }
        `}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
            送信中...
          </>
        ) : sent ? (
          <>
            <span>✓</span>
            送信完了
          </>
        ) : (
          <>
            <Bell className="w-4 h-4" />
            未受検者にリマインドを送る
          </>
        )}
      </button>
    </div>
  );
}
