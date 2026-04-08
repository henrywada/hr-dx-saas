'use client';

import { useState, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';
import { InterviewCalendar } from '@/app/(tenant)/(colored)/adm/(company_doctor)/high-stress-followup/components/InterviewCalendar';
import { 
  fetchTenantDoctors, 
  fetchMyLatestStressResultId, 
  fetchLatestActivePeriod 
} from '@/features/adm/high-stress-followup/actions';
import { useAuth } from '@/lib/auth/context';

export function InterviewBookingService() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [stressResultId, setStressResultId] = useState<string | null>(null);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([
        fetchTenantDoctors(),
        fetchMyLatestStressResultId(),
        fetchLatestActivePeriod()
      ]).then(([docs, resId, pId]) => {
        setDoctors(docs);
        if (docs.length > 0) {
          // すでに選択済みでなければ1人目をセット
          if (!doctorId) setDoctorId(docs[0].id);
        }
        setStressResultId(resId);
        setPeriodId(pId);
      }).finally(() => setLoading(false));
    }
  }, [isOpen, doctorId]);

  const buttonStyle = "inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-emerald-200/50 group shrink-0";

  return (
    <>
      <button 
        type="button" 
        onClick={() => setIsOpen(true)}
        className={buttonStyle}
      >
        <Calendar className="w-4 h-4 mr-1.5 opacity-80 group-hover:scale-110 transition-transform" />
        産業医面談予約
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col relative border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">産業医面談の予約</h3>
                  <p className="text-[10px] text-slate-500 font-medium tracking-wider">ご希望の日時を選択して予約を確定させてください</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-50/30 flex flex-col gap-4">
              {/* Doctor Selector Area - Show only if multiple doctors exist */}
              {periodId && doctors.length > 1 && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-500">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-700 whitespace-nowrap">担当産業医の選択:</span>
                  </div>
                  <select
                    value={doctorId || ''}
                    onChange={(e) => setDoctorId(e.target.value)}
                    className="flex-1 max-w-xs h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all cursor-pointer hover:border-emerald-300"
                  >
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} 先生
                      </option>
                    ))}
                  </select>
                </div>
              )}


              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-medium">読み込み中...</p>
                </div>
              ) : !periodId ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-white rounded-xl border border-dashed border-slate-200 m-8">
                  <p>現在、予約可能なストレスチェック期間がありません。</p>
                </div>
              ) : !doctorId ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-white rounded-xl border border-dashed border-slate-200 m-8">
                  <p>予約可能な産業医が見つかりませんでした。管理者にお問い合わせください。</p>
                </div>
              ) : (
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden min-h-[500px]">
                  <InterviewCalendar
                    periodId={periodId}
                    highStressList={[]} // 従業員モードでは不要
                    mode="employee"
                    doctorId={doctorId}
                    employeeId={user?.employee_id}
                    stressResultId={stressResultId ?? undefined}
                    onSaved={() => {
                      alert('予約が完了しました。');
                      setIsOpen(false);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
