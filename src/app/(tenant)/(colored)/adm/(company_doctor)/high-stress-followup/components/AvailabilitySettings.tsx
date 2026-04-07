'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  fetchMyAvailabilitySlots,
  upsertAvailabilitySlot,
  deleteAvailabilitySlot,
} from '@/features/adm/high-stress-followup/actions';
import type { DoctorAvailabilitySlot } from '@/features/adm/high-stress-followup/types';
import { Calendar, Clock, Trash2, Plus, CalendarPlus, Repeat } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const DAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function AvailabilitySettings() {
  const [slots, setSlots] = useState<DoctorAvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // フォーム用
  const [type, setType] = useState<'weekly' | 'specific'>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState(1); // 月曜
  const [specificDate, setSpecificDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');

  useEffect(() => {
    loadSlots();
  }, []);

  const loadSlots = async () => {
    setLoading(true);
    try {
      const res = await fetchMyAvailabilitySlots();
      setSlots(res);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    startTransition(async () => {
      try {
        await upsertAvailabilitySlot({
          dayOfWeek: type === 'weekly' ? dayOfWeek : null,
          specificDate: type === 'specific' ? specificDate : null,
          startTime,
          endTime,
          isActive: true,
        });
        loadSlots();
        if (type === 'specific') setSpecificDate('');
      } catch (err) {
        alert((err as Error).message);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('この枠を削除しますか？')) return;
    startTransition(async () => {
      try {
        await deleteAvailabilitySlot(id);
        loadSlots();
      } catch (err) {
        alert((err as Error).message);
      }
    });
  };

  const weeklySlots = slots.filter((s) => s.dayOfWeek !== null);
  const specificSlots = slots.filter((s) => s.specificDate !== null);

  return (
    <div className="p-6 max-w-4xl space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold text-slate-900">産業医・保健師 稼働日時設定</h3>
        <p className="text-sm text-slate-500">
          設定された時間枠内でのみ、高ストレス者の面接予約が可能になります。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* スロット追加フォーム */}
        <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex flex-col gap-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-800">新規枠を追加</h4>
          </div>

          <div className="flex bg-white p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setType('weekly')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                type === 'weekly' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Repeat className="w-4 h-4" />
              毎週
            </button>
            <button
              onClick={() => setType('specific')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                type === 'specific' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-4 h-4" />
              特定日
            </button>
          </div>

          {type === 'weekly' ? (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">曜日</label>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDayOfWeek(i)}
                    className={`w-10 h-10 rounded-full text-sm font-bold transition-all border ${
                      dayOfWeek === i
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-110'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">日付</label>
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">開始時刻</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full pl-10 text-sm rounded-lg border border-slate-300 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">終了時刻</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full pl-10 text-sm rounded-lg border border-slate-300 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleAdd}
            disabled={isPending || (type === 'specific' && !specificDate)}
            fullWidth
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold h-12"
          >
            <Plus className="w-5 h-5" />
            <span>スロット登録</span>
          </Button>
        </div>

        {/* 登録済みリスト */}
        <div className="space-y-6">
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              毎週の繰り返し
            </h4>
            <div className="space-y-2">
              {weeklySlots.length === 0 && (
                <p className="text-sm text-slate-400 py-4 text-center border-2 border-dashed border-slate-100 rounded-xl">
                  登録済みスロットはありません
                </p>
              )}
              {weeklySlots.map((s) => (
                <div
                  key={s.id}
                  className="group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all hover:border-blue-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 font-black">
                      {DAYS[s.dayOfWeek!]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">
                          {s.startTime.slice(0, 5)} 〜 {s.endTime.slice(0, 5)}
                        </span>
                        <Badge variant="primary" className="bg-blue-50 text-blue-700 border-blue-100 text-[10px]">
                          繰り返し
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">有効中</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              特定日のスポット設定
            </h4>
            <div className="space-y-2">
              {specificSlots.length === 0 && (
                <p className="text-sm text-slate-400 py-4 text-center border-2 border-dashed border-slate-100 rounded-xl">
                  登録済みスロットはありません
                </p>
              )}
              {specificSlots.map((s) => (
                <div
                  key={s.id}
                  className="group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all hover:border-indigo-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">
                          {s.specificDate} ({DAYS[new Date(s.specificDate!).getDay()]})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-600 font-medium">
                          {s.startTime.slice(0, 5)} 〜 {s.endTime.slice(0, 5)}
                        </span>
                        <Badge variant="primary" className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[10px]">
                          スポット
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-bold text-blue-600">読み込み中</span>
          </div>
        </div>
      )}
    </div>
  );
}
