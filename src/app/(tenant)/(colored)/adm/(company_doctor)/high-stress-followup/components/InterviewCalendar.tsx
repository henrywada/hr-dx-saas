'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  parseISO,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HighStressListItem } from '@/features/adm/high-stress-followup/types';
import type { ScheduledInterviewItem } from '@/features/adm/high-stress-followup/types';
import { fetchScheduledInterviews } from '@/features/adm/high-stress-followup/actions';
import { AppointmentModal } from './AppointmentModal';

interface Props {
  periodId: string;
  highStressList: HighStressListItem[];
  onSaved?: () => void;
}

export function InterviewCalendar({ periodId, highStressList, onSaved }: Props) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [interviews, setInterviews] = useState<ScheduledInterviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const yearMonth = format(viewDate, 'yyyy-MM');

  useEffect(() => {
    setLoading(true);
    fetchScheduledInterviews(periodId, yearMonth)
      .then(setInterviews)
      .finally(() => setLoading(false));
  }, [periodId, yearMonth]);

  const interviewsByDate = useMemo(() => {
    const map = new Map<string, ScheduledInterviewItem[]>();
    for (const i of interviews) {
      const d = format(parseISO(i.interviewDate), 'yyyy-MM-dd');
      const list = map.get(d) ?? [];
      list.push(i);
      map.set(d, list);
    }
    return map;
  }, [interviews]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 0 });
    const days: Date[] = [];
    let d = start;
    while (d <= end) {
      days.push(d);
      d = new Date(d);
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [viewDate]);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setModalOpen(false);
    setSelectedDate(null);
    setLoading(true);
    fetchScheduledInterviews(periodId, yearMonth)
      .then(setInterviews)
      .finally(() => setLoading(false));
    onSaved?.();
  };

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewDate((d) => subMonths(d, 1))}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-lg font-bold text-slate-800 min-w-[180px] text-center">
            {format(viewDate, 'yyyy年M月', { locale: ja })}
          </h3>
          <button
            type="button"
            onClick={() => setViewDate((d) => addMonths(d, 1))}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
            読み込み中...
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden">
            {weekDays.map((day) => (
              <div
                key={day}
                className="bg-slate-50 py-2 text-center text-xs font-bold text-slate-600"
              >
                {day}
              </div>
            ))}
            {calendarDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayInterviews = interviewsByDate.get(key) ?? [];
              const isCurrentMonth = isSameMonth(day, viewDate);

              return (
                <div
                  key={key}
                  onClick={() => handleDayClick(day)}
                  className={`min-h-[80px] bg-white p-2 cursor-pointer hover:bg-blue-50/50 transition-colors ${
                    !isCurrentMonth ? 'opacity-40' : ''
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-700 mb-1">
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayInterviews.slice(0, 3).map((i) => (
                      <div
                        key={i.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded truncate ${
                          i.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-700'
                            : i.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                        title={`${i.anonymousId} ${i.doctorName}`}
                      >
                        {i.anonymousId}
                      </div>
                    ))}
                    {dayInterviews.length > 3 && (
                      <div className="text-[10px] text-slate-500">
                        +{dayInterviews.length - 3}件
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && selectedDate && (
        <AppointmentModal
          periodId={periodId}
          highStressList={highStressList}
          initialDate={selectedDate}
          onClose={() => {
            setModalOpen(false);
            setSelectedDate(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
