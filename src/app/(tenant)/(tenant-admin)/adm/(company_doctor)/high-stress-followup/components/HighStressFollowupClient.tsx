'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Calendar, History, Bell, FileDown, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { HighStressListItem } from '@/features/adm/high-stress-followup/types';
import { HighStressList } from './HighStressList';
import { DetailPane } from './DetailPane';
import { InterviewCalendar } from './InterviewCalendar';
import { MeasureHistoryTable } from './MeasureHistoryTable';
import { ReminderSettings } from './ReminderSettings';
import { AvailabilitySettings } from './AvailabilitySettings';

type TabId = 'list' | 'calendar' | 'history' | 'availability' | 'reminder';

interface Props {
  periodId: string;
  periodTitle: string;
  initialList: HighStressListItem[];
}

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'list', label: '高ストレス者リスト', icon: FileText },
  { id: 'calendar', label: '面接予約カレンダー', icon: Calendar },
  { id: 'history', label: '実施・措置履歴', icon: History },
  { id: 'availability', label: '稼働日時設定', icon: Clock },
  { id: 'reminder', label: 'リマインダー設定', icon: Bell },
];

export function HighStressFollowupClient({ periodId, periodTitle, initialList }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDivision, setFilterDivision] = useState('');
  const [uncompletedOnly, setUncompletedOnly] = useState(false);

  const filteredItems = useMemo(() => {
    let list = initialList;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.anonymousId.toLowerCase().includes(q) ||
          (i.highStressReason?.toLowerCase().includes(q) ?? false) ||
          i.divisionAnonymousLabel.toLowerCase().includes(q)
      );
    }
    if (filterDivision) {
      list = list.filter((i) => i.divisionAnonymousLabel === filterDivision);
    }
    if (uncompletedOnly) {
      list = list.filter(
        (i) => !i.hasMeasureDecided && i.latestStatus !== 'completed'
      );
    }
    return list;
  }, [initialList, searchQuery, filterDivision, uncompletedOnly]);

  const selectedItem = useMemo(
    () => initialList.find((i) => i.stressResultId === selectedId) ?? null,
    [initialList, selectedId]
  );

  const handleRecordSaved = () => router.refresh();

  return (
    <div className="flex flex-col gap-4">
      {/* タブ */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 2カラム（タブ1） or 1カラム（タブ2〜4） */}
      {activeTab === 'list' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[400px]">
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <HighStressList
              items={filteredItems}
              selectedId={selectedId}
              onSelect={(item) => setSelectedId(item.stressResultId)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterDivision={filterDivision}
              onFilterDivisionChange={setFilterDivision}
              uncompletedOnly={uncompletedOnly}
              onUncompletedOnlyChange={setUncompletedOnly}
            />
          </div>
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <DetailPane
              item={selectedItem}
              periodId={periodId}
              onRecordSaved={handleRecordSaved}
            />
          </div>
        </div>
      ) : (
        <div className="min-h-[400px] bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {activeTab === 'calendar' && (
            <InterviewCalendar
              periodId={periodId}
              highStressList={initialList}
              onSaved={handleRecordSaved}
            />
          )}
          {activeTab === 'history' && (
            <MeasureHistoryTable periodId={periodId} onSaved={handleRecordSaved} />
          )}
          {activeTab === 'availability' && <AvailabilitySettings />}
          {activeTab === 'reminder' && <ReminderSettings />}
        </div>
      )}

      {/* フッター */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/80 rounded-xl border border-slate-100">
        <span className="text-xs text-slate-500">
          最終更新: {format(new Date(), 'yyyy/MM/dd HH:mm', { locale: ja })}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            PDF出力
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            CSVエクスポート
          </button>
        </div>
      </div>
    </div>
  );
}
