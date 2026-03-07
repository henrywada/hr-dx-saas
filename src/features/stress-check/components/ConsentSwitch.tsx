'use client';

import React, { useState, useTransition } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { updateConsentStatus } from '@/features/stress-check/actions';

interface ConsentSwitchProps {
  periodId: string;
  initialConsent: boolean;
}

export default function ConsentSwitch({ periodId, initialConsent }: ConsentSwitchProps) {
  const [consented, setConsented] = useState(initialConsent);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const newValue = !consented;
    setConsented(newValue);
    startTransition(async () => {
      const result = await updateConsentStatus(periodId, newValue);
      if (!result.success) {
        // 失敗時は元に戻す
        setConsented(!newValue);
        console.error('Consent update failed:', result.error);
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl mt-0.5">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-900">事業者（会社）への結果提供</h3>
            <p className="text-xs text-gray-500 leading-relaxed max-w-md">
              あなたのストレスチェック結果を事業者に提供し、職場環境の改善に役立てることに同意します。
              提供を希望しない場合は、スイッチをOFFに切り替えてください。
            </p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            consented ? 'bg-indigo-600' : 'bg-gray-200'
          } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
          role="switch"
          aria-checked={consented}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
              consented ? 'translate-x-5' : 'translate-x-0'
            }`}
          >
            {isPending && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
          </span>
        </button>
      </div>
      {consented && (
        <div className="mt-3 p-3 rounded-lg bg-indigo-50 text-xs text-indigo-700">
          ✓ 結果提供に同意しました。人事部門があなたの結果を閲覧できるようになります。
        </div>
      )}
    </div>
  );
}
