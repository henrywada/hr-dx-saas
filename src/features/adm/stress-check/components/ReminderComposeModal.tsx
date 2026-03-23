'use client';

import { useState } from 'react';
import { X, Bell, Send } from 'lucide-react';
import { sendStressCheckReminders } from '../actions';

const DEFAULT_SUBJECT = '【リマインド】ストレスチェックのご受検のお願い';
const DEFAULT_MESSAGE = `{{name}} 様

お疲れ様です。
ストレスチェックの受検期限が近づいております。
お手数ですが、期限内にご受検くださいますようお願い申し上げます。

※ {{name}} は各受信者名に置き換わります`;

interface ReminderComposeModalProps {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
  periodId: string;
  notSubmittedCount: number;
}

export default function ReminderComposeModal({
  open,
  onClose,
  onSent,
  periodId,
  notSubmittedCount,
}: ReminderComposeModalProps) {
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ sentCount: number; skippedCount: number } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await sendStressCheckReminders(periodId, subject, message);
    setLoading(false);

    if (res.success) {
      setResult({ sentCount: res.sentCount, skippedCount: res.skippedCount });
      if (res.sentCount > 0) {
        onSent();
      }
    } else {
      setError('error' in res ? res.error : '送信に失敗しました');
    }
  };

  const handleClose = () => {
    setError(null);
    setResult(null);
    setSubject(DEFAULT_SUBJECT);
    setMessage(DEFAULT_MESSAGE);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div
        className="fixed inset-0"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            リマインドメール送信
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {result ? (
          <div className="p-6 space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-sm font-medium text-emerald-800">
                {result.sentCount} 名へリマインドメールを送信しました。
              </p>
              {result.skippedCount > 0 && (
                <p className="text-xs text-emerald-600 mt-1">
                  メールアドレス未登録のため送信できなかった従業員: {result.skippedCount} 名
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-sm text-slate-600">
              未受検者 {notSubmittedCount} 名へリマインドメールを送信します。
              メールアドレスが登録されている従業員のみ送信されます。
            </p>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">件名</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="件名を入力"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">メッセージ</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="メッセージを入力"
                rows={8}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-y"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">
                ※ {'{{name}}'} は各受信者の氏名に置き換わります
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
                    送信中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    送信する
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
