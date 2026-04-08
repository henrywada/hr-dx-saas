'use client';

import { useState, useEffect, useTransition } from 'react';
import type { HighStressListItem } from '@/features/adm/high-stress-followup/types';
import {
  createInterviewAppointment,
  fetchActuallyAvailableSlotsForDate,
  fetchTenantAllEmployees,
} from '@/features/adm/high-stress-followup/actions';
import { format } from 'date-fns';
import { X, AlertCircle, Clock, CheckCircle2, User, Users } from 'lucide-react';

interface Props {
  periodId: string;
  highStressList: HighStressListItem[];
  initialDate: Date;
  onClose: () => void;
  onSaved: () => void;
  // 追加属性
  mode?: 'admin' | 'employee';
  doctorId?: string;
  employeeId?: string;
  stressResultId?: string;
}

type Slot = { startTime: string; endTime: string; id: string; isBooked: boolean };

export function AppointmentModal({
  periodId,
  highStressList,
  initialDate,
  onClose,
  onSaved,
  mode = 'admin',
  doctorId,
  employeeId,
  stressResultId,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [selectedItem, setSelectedItem] = useState<HighStressListItem | null>(null);
  const [interviewDate, setInterviewDate] = useState(
    () => format(initialDate, "yyyy-MM-dd'T'09:00")
  );
  const [interviewNotes, setInterviewNotes] = useState('');
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  // 追加: 任意の従業員選択用ステート
  const [targetType, setTargetType] = useState<'high_stress' | 'all'>('high_stress');
  const [allEmployees, setAllEmployees] = useState<{ id: string; name: string; employee_no: string | null }[]>([]);
  const [selectedGenericEmployeeId, setSelectedGenericEmployeeId] = useState('');

  const dateStr = format(initialDate, 'yyyy-MM-dd');

  useEffect(() => {
    setLoadingSlots(true);
    Promise.all([
      fetchActuallyAvailableSlotsForDate(dateStr, doctorId),
      mode === 'admin' ? fetchTenantAllEmployees() : Promise.resolve([]),
    ]).then(([slots, employees]) => {
      setAvailableSlots(slots);
      if (employees) {
        setAllEmployees(employees);
      }
      
      // 空いている最初のスロットを探す
      const firstFree = slots.find(s => !s.isBooked);
      if (firstFree) {
        const firstStart = firstFree.startTime.slice(0, 5);
        setInterviewDate(`${dateStr}T${firstStart}`);
      } else {
        // すべて埋まっている場合は日付のみセット
        setInterviewDate(`${dateStr}T09:00`);
      }
    }).finally(() => setLoadingSlots(false));
  }, [dateStr, doctorId, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 従業員の決定 (管理者モードなら選択肢、従業員モードなら prop または null)
    let targetStressResultId: string | null = stressResultId || null;
    let targetEmployeeId: string | null = employeeId || null;

    if (mode === 'admin') {
      if (targetType === 'high_stress') {
        if (!selectedItem) {
          alert('対象者（高ストレス者）を選択してください');
          return;
        }
        targetStressResultId = selectedItem.stressResultId;
        targetEmployeeId = selectedItem.employeeId;
      } else {
        if (!selectedGenericEmployeeId) {
          alert('対象の従業員を選択してください');
          return;
        }
        targetStressResultId = null; // 汎用予約のためストレスチェック結果はなし
        targetEmployeeId = selectedGenericEmployeeId;
      }
    } else {
      // 従業員モードだが従業員IDが渡されていない場合
      if (!targetEmployeeId) {
        alert('予約に必要な情報が不足しています（従業員ID確認エラー）');
        return;
      }
    }

    startTransition(async () => {
      try {
        await createInterviewAppointment(
          targetStressResultId || null,
          targetEmployeeId!,
          interviewDate,
          { 
            doctorId: doctorId!, 
            interviewNotes: interviewNotes || undefined 
          }
        );

        onSaved();
      } catch (err) {
        alert((err as Error).message);
      }
    });
  };

  const isSelectedSlotBooked = availableSlots.find(
    s => `${dateStr}T${s.startTime.slice(0, 5)}` === interviewDate
  )?.isBooked;

  const allSlotsBooked = availableSlots.length > 0 && availableSlots.every(s => s.isBooked);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">面接予約を登録</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form id="appointment-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
            <span className="text-sm font-bold text-blue-800">予約希望日</span>
            <span className="text-sm font-black text-blue-900">{dateStr}</span>
          </div>

          {mode === 'admin' && (
            <div className="space-y-3">
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setTargetType('high_stress')}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-all ${
                    targetType === 'high_stress' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  高ストレス対象者
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('all')}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-all ${
                    targetType === 'all' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  任意の従業員
                </button>
              </div>

              {targetType === 'high_stress' ? (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">対象者（匿名ID）</label>
                  <select
                    value={selectedItem?.stressResultId ?? ''}
                    onChange={(e) => {
                      const item = highStressList.find((i) => i.stressResultId === e.target.value);
                      setSelectedItem(item ?? null);
                    }}
                    required
                    className="w-full text-sm rounded-lg border border-slate-300 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="">選択してください</option>
                    {highStressList.map((i) => (
                      <option key={i.stressResultId} value={i.stressResultId}>
                        {i.anonymousId} - {i.divisionAnonymousLabel}
                        {i.highStressReason ? ` (${i.highStressReason.slice(0, 15)}...)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">対象者（氏名・所属）</label>
                  <select
                    value={selectedGenericEmployeeId}
                    onChange={(e) => setSelectedGenericEmployeeId(e.target.value)}
                    required
                    className="w-full text-sm rounded-lg border border-slate-300 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="">選択してください</option>
                    {allEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employee_no ? `${emp.employee_no} ` : ''}{emp.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
              稼働時間スロットを選択
            </label>
            {loadingSlots ? (
              <div className="h-10 animate-pulse bg-slate-100 rounded-lg" />
            ) : availableSlots.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800">稼働枠が登録されていません</p>
                  <p className="text-xs text-amber-600 mt-1">
                    「稼働日時設定」タブから稼働枠を登録してください。
                  </p>
                </div>
              </div>
            ) : allSlotsBooked ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-slate-600">この日の予約枠はすべて埋まっています</p>
                  <p className="text-xs text-slate-500 mt-1">
                    別の日程を選択するか、新しく稼働枠を追加してください。
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {availableSlots.map((s) => {
                  const start = s.startTime.slice(0, 5);
                  const end = s.endTime.slice(0, 5);
                  const val = `${dateStr}T${start}`;
                  const isSelected = interviewDate === val;

                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={s.isBooked}
                      onClick={() => setInterviewDate(val)}
                      className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg border text-sm font-bold transition-all relative ${
                        s.isBooked
                          ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-60'
                          : isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/20'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                      }`}
                    >
                      <span>{start} 〜 {end}</span>
                      {s.isBooked && (
                        <span className="text-[10px] mt-0.5 font-medium flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> 予約済み
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`${(availableSlots.length === 0 || allSlotsBooked) ? 'opacity-50 pointer-events-none' : ''}`}>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">面接開始時刻</label>
            <input
              type="datetime-local"
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
              required
              min={`${dateStr}T00:00`}
              max={`${dateStr}T23:59`}
              className={`w-full text-sm rounded-lg border py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                isSelectedSlotBooked ? 'border-red-300 bg-red-50 text-red-600' : 'border-slate-300'
              }`}
            />
            {isSelectedSlotBooked && (
              <p className="text-[10px] text-red-500 mt-1 font-bold">※選択された時間は既に予約済みです</p>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
              メモ（場所・オンライン/対面など）
            </label>
            <textarea
              value={interviewNotes}
              onChange={(e) => setInterviewNotes(e.target.value)}
              rows={3}
              placeholder="任意"
              className="w-full text-sm rounded-lg border border-slate-300 py-2.5 px-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </form>

        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition"
          >
            キャンセル
          </button>
          <button
            type="submit"
            form="appointment-form"
            disabled={isPending || availableSlots.length === 0 || allSlotsBooked || isSelectedSlotBooked}
            className="px-8 py-2 text-sm font-black text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-lg shadow-slate-200 transition disabled:opacity-30 disabled:shadow-none"
          >
            {isPending ? '保存中...' : '予約を登録'}
          </button>
        </div>
      </div>
    </div>
  );
}
