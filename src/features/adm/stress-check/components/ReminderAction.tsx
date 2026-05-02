'use client';

import { Bell, List } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import NotSubmittedListModal from './NotSubmittedListModal';
import ReminderComposeModal, { type ReminderEstablishmentOption } from './ReminderComposeModal';

interface ReminderActionProps {
  periodId?: string;
  notSubmittedCount?: number;
  establishmentOptions?: ReminderEstablishmentOption[];
}

export default function ReminderAction({
  periodId,
  notSubmittedCount = 0,
  establishmentOptions = [],
}: ReminderActionProps) {
  const router = useRouter();
  const [listModalOpen, setListModalOpen] = useState(false);
  const [composeModalOpen, setComposeModalOpen] = useState(false);

  return (
    <div className="flex items-center justify-between bg-linear-to-r from-slate-50 to-gray-50 border border-gray-200 rounded-2xl p-5">
      <div className="flex items-center gap-4">
        <div className="bg-amber-100 p-3 rounded-xl">
          <Bell className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800">リマインド通知</p>
          <p className="text-xs text-gray-500 mt-0.5">
            未受検の従業員に対してリマインドメールを送信します（全員または拠点指定）
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {notSubmittedCount > 0 && periodId && (
          <button
            type="button"
            onClick={() => setListModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition-colors"
          >
            <List className="w-4 h-4" />
            未受検者一覧を表示
          </button>
        )}
        <button
          type="button"
          onClick={() => setComposeModalOpen(true)}
          disabled={notSubmittedCount === 0}
          className={`
          inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
          transition-all duration-300 shadow-sm
          ${
            notSubmittedCount === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-linear-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 hover:shadow-md active:scale-95'
          }
        `}
        >
          <Bell className="w-4 h-4" />
          未受検者にリマインドを送る
        </button>
      </div>

      {periodId && (
        <>
          <NotSubmittedListModal
            open={listModalOpen}
            onClose={() => setListModalOpen(false)}
            periodId={periodId}
          />
          <ReminderComposeModal
            open={composeModalOpen}
            onClose={() => setComposeModalOpen(false)}
            onSent={() => router.refresh()}
            periodId={periodId}
            notSubmittedCount={notSubmittedCount}
            establishmentOptions={establishmentOptions}
          />
        </>
      )}
    </div>
  );
}
